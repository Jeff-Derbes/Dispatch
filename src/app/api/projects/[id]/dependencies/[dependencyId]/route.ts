import { auth } from "@clerk/nextjs/server";
import { getProjectById } from "@/db/queries/projects";
import { getDependencyById, deleteDependency } from "@/db/queries/dependencies";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; dependencyId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, dependencyId } = await params;

    const project = await getProjectById(userId, projectId);
    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const dependency = await getDependencyById(dependencyId);
    if (!dependency) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (dependency.userId !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteDependency(userId, dependencyId);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
