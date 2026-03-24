import { auth } from "@clerk/nextjs/server";
import { deleteTask, getTaskById, updateTask } from "@/db/queries/tasks";
import { updateTaskSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json();
  const result = updateTaskSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const existing = await getTaskById(userId, id);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const task = await updateTask(userId, id, result.data);
  return Response.json({ data: task });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await getTaskById(userId, id);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await deleteTask(userId, id);
  return Response.json({ data: null });
}
