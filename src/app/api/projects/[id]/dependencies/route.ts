import { auth } from "@clerk/nextjs/server";
import { getProjectById } from "@/db/queries/projects";
import { getTaskById } from "@/db/queries/tasks";
import {
  createDependency,
  getProjectDependencyGraph,
} from "@/db/queries/dependencies";
import { wouldCreateCycle } from "@/lib/cycle-detection";
import { createDependencySchema } from "@/lib/validations";

export async function POST(
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

    const result = createDependencySchema.safeParse(body);
    if (!result.success) {
      return Response.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { taskId, dependsOnTaskId } = result.data;

    // Reject self-dependency
    if (taskId === dependsOnTaskId) {
      return Response.json(
        { error: "A task cannot depend on itself" },
        { status: 400 }
      );
    }

    // Verify both tasks exist and belong to this project and user
    const [task, dependsOnTask] = await Promise.all([
      getTaskById(userId, taskId),
      getTaskById(userId, dependsOnTaskId),
    ]);

    if (!task || task.projectId !== projectId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!dependsOnTask || dependsOnTask.projectId !== projectId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cycle detection
    const graph = await getProjectDependencyGraph(userId, projectId);
    if (wouldCreateCycle(graph, taskId, dependsOnTaskId)) {
      return Response.json(
        { error: "Dependency would create a cycle" },
        { status: 409 }
      );
    }

    // Insert — catch unique constraint violation
    try {
      const dependency = await createDependency({
        projectId,
        userId,
        taskId,
        dependsOnTaskId,
      });
      return Response.json({ data: dependency }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("uq_task_dep")) {
        return Response.json(
          { error: "Dependency already exists" },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch {
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
