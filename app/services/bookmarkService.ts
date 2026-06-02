import { eq, and } from "drizzle-orm";
import { db } from "~/db";
import { lessonBookmarks, lessons, modules } from "~/db/schema";

export function toggleBookmark({
  userId,
  lessonId,
}: {
  userId: number;
  lessonId: number;
}): { bookmarked: boolean } {
  const existing = db
    .select({ id: lessonBookmarks.id })
    .from(lessonBookmarks)
    .where(
      and(
        eq(lessonBookmarks.userId, userId),
        eq(lessonBookmarks.lessonId, lessonId)
      )
    )
    .get();

  if (existing) {
    db.delete(lessonBookmarks)
      .where(
        and(
          eq(lessonBookmarks.userId, userId),
          eq(lessonBookmarks.lessonId, lessonId)
        )
      )
      .run();
    return { bookmarked: false };
  }

  db.insert(lessonBookmarks).values({ userId, lessonId }).run();
  return { bookmarked: true };
}

export function isLessonBookmarked({
  userId,
  lessonId,
}: {
  userId: number;
  lessonId: number;
}): boolean {
  const existing = db
    .select({ id: lessonBookmarks.id })
    .from(lessonBookmarks)
    .where(
      and(
        eq(lessonBookmarks.userId, userId),
        eq(lessonBookmarks.lessonId, lessonId)
      )
    )
    .get();
  return !!existing;
}

export function getBookmarkedLessonIds({
  userId,
  courseId,
}: {
  userId: number;
  courseId: number;
}): number[] {
  const results = db
    .select({ lessonId: lessonBookmarks.lessonId })
    .from(lessonBookmarks)
    .innerJoin(lessons, eq(lessonBookmarks.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(
      and(
        eq(lessonBookmarks.userId, userId),
        eq(modules.courseId, courseId)
      )
    )
    .all();
  return results.map((r) => r.lessonId);
}
