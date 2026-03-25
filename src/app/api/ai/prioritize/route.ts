import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { aiPrioritizeSchema } from "@/lib/validations";
import { getTaskById } from "@/db/queries/tasks";

const suggestionSchema = z.array(
  z.object({
    id: z.string().uuid(),
    suggestedPriority: z.enum(["low", "medium", "high"]),
    rationale: z.string(),
  })
);

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = aiPrioritizeSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  // Verify every task ID belongs to the authed user before sending to Claude
  for (const task of result.data.tasks) {
    const dbTask = await getTaskById(userId, task.id);
    if (!dbTask) {
      return Response.json(
        { error: "Task not found or unauthorized" },
        { status: 404 }
      );
    }
  }

  const client = new Anthropic();

  let fullText: string;
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: `You are a task prioritization assistant. Priority framework:
- High: blocking or time-sensitive work.
- Medium: important but not urgent.
- Low: nice-to-have.
Return ONLY a JSON array with no markdown or explanation.`,
      messages: [
        {
          role: "user",
          content: `Here are the tasks:\n${JSON.stringify(result.data.tasks, null, 2)}\n\nReturn a ranked array of [{ id, suggestedPriority, rationale }] where rationale is one sentence max.`,
        },
      ],
    });

    // Find text block — may be preceded by thinking blocks when adaptive thinking is active
    const textBlock = message.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    if (!textBlock) {
      return Response.json(
        { error: "No text response from AI" },
        { status: 500 }
      );
    }
    fullText = textBlock.text;
  } catch {
    return Response.json(
      { error: "Failed to contact AI service" },
      { status: 500 }
    );
  }

  try {
    const cleaned = fullText
      .trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    const suggestions = suggestionSchema.parse(parsed);
    return Response.json({ data: suggestions });
  } catch {
    return Response.json(
      { error: "AI returned an invalid response" },
      { status: 500 }
    );
  }
}
