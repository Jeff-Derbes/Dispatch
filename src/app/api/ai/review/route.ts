import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db/index";
import { projectAiReviews, tasks } from "@/db/schema";
import { getProjectById } from "@/db/queries/projects";
import { getNonDoneProjectTasks } from "@/db/queries/tasks";
import { getProjectDependencyGraph } from "@/db/queries/dependencies";
import { aiReviewRequestSchema, aiReviewResponseSchema } from "@/lib/validations";
import { and, eq } from "drizzle-orm";

const REVIEW_SYSTEM_PROMPT = `You are an execution planning assistant for Dispatch.

Analyze the provided project task list and dependency graph. Return a structured review as raw JSON only. No markdown. No prose outside the JSON.

Output format:
{
  "summary": string,
  "nextActionTaskId": string,
  "risks": string[],
  "gaps": [{ "title": string, "description": string }],
  "rebalance": [{ "taskId": string, "suggestedPriority": "low"|"medium"|"high", "rationale": string }]
}

Rules:
- summary: one sentence capturing the overall state of the plan.
- nextActionTaskId: the UUID of exactly one task from the provided list that is the best next action. Must be a task that is not done and not blocked.
- risks: flag sequencing or dependency risks only when meaningful. Empty array if none.
- gaps: suggest missing tasks only when the gap is significant. Empty array if none.
- rebalance: suggest priority changes only for tasks where current priority seems wrong. Keep rationales to one or two sentences. Empty array if none.
- Respond with the JSON object only.`;

const REBALANCE_SYSTEM_PROMPT = `You are an execution planning assistant for Dispatch.

Analyze the provided project task list and dependency graph. Return a structured review as raw JSON only. No markdown. No prose outside the JSON.

Output format:
{
  "summary": string,
  "nextActionTaskId": string,
  "risks": string[],
  "gaps": [{ "title": string, "description": string }],
  "rebalance": [{ "taskId": string, "suggestedPriority": "low"|"medium"|"high", "rationale": string }]
}

Rules:
- summary: one sentence describing the reprioritization.
- nextActionTaskId: the UUID of the single best next task to work on given current progress.
- risks: empty array unless critical.
- gaps: empty array.
- rebalance: focus here — suggest updated priorities for tasks that are sequenced wrong or over/under-weighted. Keep rationales to one or two sentences.
- Respond with the JSON object only.`;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = aiReviewRequestSchema.safeParse(body);
    if (!result.success) {
      return Response.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { projectId, mode } = result.data;

    const project = await getProjectById(userId, projectId);
    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const [nonDoneTasks, graph] = await Promise.all([
      getNonDoneProjectTasks(userId, projectId),
      getProjectDependencyGraph(userId, projectId),
    ]);

    if (nonDoneTasks.length === 0) {
      return Response.json(
        { error: "No active tasks to review" },
        { status: 400 }
      );
    }

    const userMessage = JSON.stringify(
      { tasks: nonDoneTasks, dependencies: graph },
      null,
      2
    );

    const client = new Anthropic();
    const systemPrompt = mode === "rebalance" ? REBALANCE_SYSTEM_PROMPT : REVIEW_SYSTEM_PROMPT;

    let rawText: string;
    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      const textBlock = message.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      if (!textBlock) {
        return Response.json(
          { error: "No text response from AI" },
          { status: 500 }
        );
      }
      rawText = textBlock.text;
    } catch {
      return Response.json(
        { error: "Failed to contact AI service" },
        { status: 500 }
      );
    }

    let parsed: unknown;
    try {
      const cleaned = rawText
        .trim()
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return Response.json(
        { error: "AI returned an invalid response" },
        { status: 422 }
      );
    }

    const validation = aiReviewResponseSchema.safeParse(parsed);
    if (!validation.success) {
      return Response.json(
        { error: "AI response did not match expected schema", details: validation.error.issues },
        { status: 422 }
      );
    }

    const review = validation.data;

    // Validate nextActionTaskId exists in the fetched task list
    const taskIds = new Set(nonDoneTasks.map((t) => t.id));
    if (!taskIds.has(review.nextActionTaskId)) {
      return Response.json(
        { error: "AI referenced a non-existent task as next action" },
        { status: 422 }
      );
    }

    // Drop rebalance entries with taskIds not in the task list
    const validRebalance = review.rebalance.filter((r) => taskIds.has(r.taskId));

    // Use per-task rebalance rationale if available, otherwise fall back to summary
    const nextActionRebalanceEntry = validRebalance.find(
      (r) => r.taskId === review.nextActionTaskId
    );
    const nextActionRationale =
      nextActionRebalanceEntry?.rationale ?? review.summary;

    const now = new Date();

    // Write everything in a single transaction
    await db.transaction(async (tx) => {
      // Insert review row
      await tx.insert(projectAiReviews).values({
        projectId,
        userId,
        summary: review.summary,
        nextActionTaskId: review.nextActionTaskId,
        risksJson: review.risks,
        gapsJson: review.gaps,
        rebalanceJson: validRebalance,
      });

      // Clear recommended_next on all tasks for this project
      await tx
        .update(tasks)
        .set({ recommendedNext: false })
        .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)));

      // Set recommended_next and update AI fields on the next action task
      await tx
        .update(tasks)
        .set({
          recommendedNext: true,
          aiRationale: nextActionRationale,
          lastAiReviewedAt: now,
          updatedAt: now,
        })
        .where(
          and(eq(tasks.id, review.nextActionTaskId), eq(tasks.userId, userId))
        );
    });

    return Response.json({
      data: {
        ...review,
        rebalance: validRebalance,
      },
    });
  } catch {
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
