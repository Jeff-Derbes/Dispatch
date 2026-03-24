import { auth } from "@clerk/nextjs/server";
import {
  deleteProject,
  getProjectById,
  updateProject,
} from "@/db/queries/projects";
import { updateProjectSchema } from "@/lib/validations";

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
  const result = updateProjectSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const existing = await getProjectById(userId, id);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const project = await updateProject(userId, id, result.data);
  return Response.json({ data: project });
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

  const existing = await getProjectById(userId, id);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await deleteProject(userId, id);
  return Response.json({ data: null });
}
