import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { projectAiReviews } from "../schema";

export async function getLatestProjectReview(
  userId: string,
  projectId: string
) {
  const rows = await db
    .select()
    .from(projectAiReviews)
    .where(
      and(
        eq(projectAiReviews.userId, userId),
        eq(projectAiReviews.projectId, projectId)
      )
    )
    .orderBy(desc(projectAiReviews.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
