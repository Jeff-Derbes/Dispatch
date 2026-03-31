import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { getProjectById } from "@/db/queries/projects";
import { aiPlanRequestSchema, aiPlanResponseSchema } from "@/lib/validations";

const SYSTEM_PROMPT = `You are a technical project planning assistant for Dispatch, a personal project tracker.

Generate a structured execution plan as raw JSON only. No markdown. No prose outside the JSON object.

Output format:
{
  "summary": "One sentence describing the overall plan.",
  "phases": [{ "name": string, "order": number }],
  "tasks": [
    {
      "clientId": "temp-N",
      "title": string,
      "description": string,
      "priority": "low" | "medium" | "high",
      "effort": "small" | "medium" | "large",
      "impact": "low" | "medium" | "high",
      "phase": string | null,
      "dependsOnClientIds": string[]
    }
  ]
}

Rules:
- Generate 4–10 tasks.
- clientId values must be unique strings in the format "temp-1", "temp-2", etc.
- Include a dependency (dependsOnClientIds) only when a clear prerequisite relationship exists.
- Do not create circular dependency chains.
- Keep titles concrete and action-oriented (start with a verb).
- phases should reflect natural stages of work. Use null for phase if no phases apply.
- Respond with the JSON object only. No explanation, no markdown backticks.`;

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

    const result = aiPlanRequestSchema.safeParse(body);
    if (!result.success) {
      return Response.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { projectId, projectName, description } = result.data;

    const project = await getProjectById(userId, projectId);
    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const client = new Anthropic();

    let rawText: string;
    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Project: ${projectName}\n\nGoal: ${description}\n\nGenerate the execution plan.`,
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

    const validation = aiPlanResponseSchema.safeParse(parsed);
    if (!validation.success) {
      return Response.json(
        { error: "AI response did not match expected schema", details: validation.error.issues },
        { status: 422 }
      );
    }

    return Response.json({ data: validation.data });
  } catch {
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
