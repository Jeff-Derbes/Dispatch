import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import {
  projectAiReviews,
  type Gap,
  type RebalanceSuggestion,
  type Risk,
} from "../schema";

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

export async function createAiReview(data: {
  projectId: string;
  userId: string;
  summary: string;
  nextActionTaskId: string | null;
  risks: Risk[];
  gaps: Gap[];
  rebalance: RebalanceSuggestion[];
}) {
  const rows = await db
    .insert(projectAiReviews)
    .values({
      projectId: data.projectId,
      userId: data.userId,
      summary: data.summary,
      nextActionTaskId: data.nextActionTaskId,
      risksJson: data.risks,
      gapsJson: data.gaps,
      rebalanceJson: data.rebalance,
    })
    .returning();
  return rows[0];
}
