import { auth } from "@clerk/nextjs/server";
import { getProjectById } from "@/db/queries/projects";
import { reorderTasks } from "@/db/queries/tasks";
import { reorderTasksSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await getProjectById(userId, id);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const result = reorderTasksSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  await reorderTasks(userId, result.data.updates);
  return Response.json({ data: null });
}
