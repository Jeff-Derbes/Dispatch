import { auth } from "@clerk/nextjs/server";
import { getProjectById } from "@/db/queries/projects";
import { getTaskById, setNextAction } from "@/db/queries/tasks";
import { nextActionUpdateSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const project = await getProjectById(userId, projectId);
    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = nextActionUpdateSchema.safeParse(body);
    if (!result.success) {
      return Response.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { taskId } = result.data;

    if (taskId !== null) {
      const task = await getTaskById(userId, taskId);
      if (!task || task.projectId !== projectId) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      if (task.status === "done") {
        return Response.json(
          { error: "Cannot set a completed task as next action" },
          { status: 400 }
        );
      }
    }

    await setNextAction(projectId, taskId, userId);
    return Response.json({ data: null });
  } catch {
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
