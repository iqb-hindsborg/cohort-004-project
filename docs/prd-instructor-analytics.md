# PRD: Instructor Analytics Dashboard

## Problem Statement

Instructors can create and manage courses, but have no visibility into the business or pedagogical performance of their work. They cannot see how much revenue their courses have generated, where students are dropping out of a course, or how students are performing on quizzes. This makes it impossible to make data-informed decisions about pricing, content quality, or which lessons need improvement.

## Solution

Expand the instructor interface in two places:

1. **Main instructor dashboard** (`/instructor`) — add a summary bar showing total gross revenue and total enrollments across all courses, plus per-course revenue on each course card.
2. **New "Analytics" tab on the course editor** (`/instructor/:courseId`) — a lesson-by-lesson funnel table showing where students drop off, alongside quiz pass rates and average scores for each lesson that has a quiz.

All data is derived from existing tables (`purchases`, `enrollments`, `lessonProgress`, `quizAttempts`) with no schema changes required.

## User Stories

1. As an instructor, I want to see my total gross revenue across all courses on my dashboard, so that I can understand the overall financial performance of my teaching.
2. As an instructor, I want to see the total number of students enrolled across all my courses on the dashboard, so that I can gauge my overall reach at a glance.
3. As an instructor, I want to see the gross revenue per course on each course card, so that I can compare the financial performance of individual courses.
4. As an instructor, I want to see the number of purchases per course on each course card, so that I can distinguish between a high-revenue course and a high-volume course.
5. As an instructor, I want an "Analytics" tab on my course editor, so that I can access course-specific performance data without leaving the course management context.
6. As an instructor, I want to see total enrolled students for a course in the Analytics tab summary, so that I have a baseline for interpreting funnel percentages.
7. As an instructor, I want to see the overall course completion rate in the Analytics tab summary, so that I can assess whether students are finishing what they start.
8. As an instructor, I want to see the total gross revenue for a specific course in the Analytics tab summary, so that I have financial context alongside pedagogical metrics.
9. As an instructor, I want a lesson funnel table ordered by module and lesson position, so that I can see the natural progression students take through my course.
10. As an instructor, I want to see how many students completed each lesson in the funnel table, so that I can identify which lesson causes the largest absolute drop in engagement.
11. As an instructor, I want to see a drop-off percentage for each lesson in the funnel table, so that I can quickly spot the highest-friction point in the course.
12. As an instructor, I want to see the quiz pass rate for each lesson that has a quiz, so that I can identify quizzes that students are failing disproportionately.
13. As an instructor, I want to see the average quiz score for each lesson's quiz in the same table row, so that I can distinguish between a quiz where students barely fail versus one where students struggle fundamentally.
14. As an instructor, I want lessons without quizzes to show blank quiz columns rather than zeroes, so that I am not misled into thinking those lessons have a 0% pass rate.
15. As an instructor, I want the funnel data to reflect all-time activity, so that I have the most complete picture of student behaviour without needing to configure a date range.
16. As an instructor, I want revenue figures displayed in dollars (not cents), so that I can read them without mental conversion.
17. As an instructor, I want the Analytics tab to be visible only to the course's owning instructor, so that my course performance data remains private.

## Implementation Decisions

- **No schema changes.** All analytics are derived from existing tables: `purchases` (revenue), `enrollments` (enrollment counts and completion), `lessonProgress` (funnel), and `quizAttempts` (quiz stats).

- **New `analyticsService` module.** All analytics queries are encapsulated in a new service file, following the same pattern as `enrollmentService`, `purchaseService`, and `progressService`. Functions to expose:
  - `getRevenueForCourse(courseId)` → `{ totalCents: number, purchaseCount: number }`
  - `getRevenueForInstructor(instructorId)` → `{ totalCents: number, totalEnrollments: number }`
  - `getLessonFunnelForCourse(courseId)` → ordered array of `{ lessonId, lessonTitle, moduleTitle, completedCount, dropOffRate }`
  - `getQuizStatsForCourse(courseId)` → map of `lessonId → { passRate: number, avgScore: number }`

- **Drop-off definition.** For each lesson, `completedCount` = number of enrolled students who have a `lessonProgress` record with `status = 'completed'` for that lesson. Drop-off rate for lesson N = `1 - (completedCount[N] / completedCount[N-1])`, with lesson 1's drop-off based on enrolled count. The funnel is ordered by module `position` then lesson `position`.

- **Revenue is gross.** `pricePaid` from the `purchases` table is summed directly. No payment processor is involved. Displayed values are labelled as gross revenue to set instructor expectations.

- **Main dashboard loader change.** The `/instructor` route loader adds a call to `getRevenueForInstructor(instructorId)` to supply the summary bar figures. Per-course revenue is fetched via `getRevenueForCourse(courseId)` for each course, or in a single batch query.

- **Analytics tab added to course editor.** The course editor (`/instructor/:courseId`) gains a fifth tab: "Analytics". The tab's data is loaded in the existing route loader alongside the other tab data. No new route is created.

- **Formatting.** Revenue cents are converted to dollars with two decimal places (`pricePaid / 100`) in the UI layer, not the service layer. Services always return raw cents.

- **All-time data only.** No date range filtering in this version. Data represents the full lifetime of the course.

## Testing Decisions

Good tests for this feature test the **output of service functions given specific database state** — not the UI rendering or loader wiring. Each test seeds a fresh in-memory SQLite database using `createTestDb()` + `seedBaseData()` from `~/test/setup`, and asserts on the return values of service functions. This is the established pattern across the service test suite (see `enrollmentService.test.ts`, `purchaseService.test.ts`).

**Modules to test:** `analyticsService` (new module — all four functions).

**Test cases to cover:**

- `getRevenueForCourse`: returns zero when no purchases exist; sums correctly across multiple purchases; counts purchases correctly.
- `getRevenueForInstructor`: aggregates revenue across multiple courses owned by the same instructor; excludes courses owned by other instructors; returns zero totals when no purchases exist.
- `getLessonFunnelForCourse`: returns lessons in module/position order; `completedCount` reflects only students who have a `completed` lessonProgress record; `in_progress` records do not inflate the count; returns empty array for a course with no lessons; handles a course where no students have any progress.
- `getQuizStatsForCourse`: returns correct pass rate and average score when multiple attempts exist; uses all attempts (not just the best) for pass rate calculation; returns an empty map for a course with no quizzes; lessons without quizzes are absent from the map.

## Out of Scope

- Date range filtering or time-series charts (e.g. revenue over time, enrollments per week).
- Question-level quiz analytics (which specific questions students get wrong most often).
- Net revenue after payment processor fees or refunds — no payment processor is integrated.
- Email or notification triggers based on analytics thresholds.
- Comparison between courses or benchmarking against cohort averages.
- Student-level drill-down from the funnel (the existing Students tab already covers per-student progress).
- Export to CSV or any external reporting tool.

## Further Notes

- The existing Students tab on the course editor already shows per-student progress and quiz scores. The new Analytics tab is complementary — it shows aggregate patterns, not individual student detail. These two tabs serve different questions: "how is each student doing?" vs. "where does the course lose students?".
- The `videoWatchEvents` table exists and could power richer drop-off analysis (exact playback position where students stop). This is a natural v2 extension once the funnel baseline is established.
- PPP (purchasing power parity) pricing is already implemented via the `pppEnabled` flag on courses. Revenue figures will naturally reflect varied `pricePaid` values per country — this is expected behaviour, not a bug.
