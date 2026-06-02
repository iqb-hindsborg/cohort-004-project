import { eq, avg, count, and, or } from "drizzle-orm";
import { db } from "~/db";
import { courseRatings } from "~/db/schema";

export function upsertCourseRating(
  userId: number,
  courseId: number,
  rating: number
) {
  return db
    .insert(courseRatings)
    .values({ userId, courseId, rating })
    .onConflictDoUpdate({
      target: [courseRatings.userId, courseRatings.courseId],
      set: { rating },
    })
    .returning()
    .get();
}

export function getUserCourseRating(userId: number, courseId: number) {
  return db
    .select({ rating: courseRatings.rating })
    .from(courseRatings)
    .where(
      and(
        eq(courseRatings.userId, userId),
        eq(courseRatings.courseId, courseId)
      )
    )
    .get();
}

export function getCourseRatingStats(courseId: number): {
  average: number | null;
  count: number;
} {
  const result = db
    .select({
      average: avg(courseRatings.rating),
      count: count(courseRatings.id),
    })
    .from(courseRatings)
    .where(eq(courseRatings.courseId, courseId))
    .get();

  if (!result) return { average: null, count: 0 };
  return {
    average: result.average !== null ? Number(result.average) : null,
    count: result.count,
  };
}

export function getRatingStatsForCourses(courseIds: number[]): Map<
  number,
  { average: number | null; count: number }
> {
  if (courseIds.length === 0) return new Map();

  const results = db
    .select({
      courseId: courseRatings.courseId,
      average: avg(courseRatings.rating),
      count: count(courseRatings.id),
    })
    .from(courseRatings)
    .where(or(...courseIds.map((id) => eq(courseRatings.courseId, id)))!)
    .groupBy(courseRatings.courseId)
    .all();

  const map = new Map<number, { average: number | null; count: number }>();
  for (const row of results) {
    map.set(row.courseId, {
      average: row.average !== null ? Number(row.average) : null,
      count: row.count,
    });
  }
  return map;
}
