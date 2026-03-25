import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { aiBreakdownSchema } from "@/lib/validations";

const aiTaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high"]),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = aiBreakdownSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { projectName, description } = result.data;

  const client = new Anthropic();

  let fullText: string;
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system:
        'You are a technical project planning assistant. Return ONLY a JSON array of 4–8 concrete, actionable tasks. Each task: { title, description, priority }. Priority must be "low" | "medium" | "high". No markdown, no explanation — raw JSON array only.',
      messages: [
        {
          role: "user",
          content: `Project: ${projectName}\n\nGoal: ${description}\n\nReturn the task array.`,
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

  let tasks: Array<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
  }>;
  try {
    // Strip potential markdown code fences the model may add despite instructions
    const cleaned = fullText
      .trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    tasks = z.array(aiTaskSchema).parse(parsed);
  } catch {
    return Response.json(
      { error: "AI returned an invalid response" },
      { status: 500 }
    );
  }

  // Stream each task as an NDJSON line so the client can render them progressively
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const task of tasks) {
        controller.enqueue(encoder.encode(JSON.stringify(task) + "\n"));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
