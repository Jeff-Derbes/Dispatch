import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { projects } from "../schema";

export async function getUserProjects(userId: string) {
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectById(userId: string, projectId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)));
  return rows[0] ?? null;
}

export async function createProject(
  userId: string,
  data: { name: string; description?: string; status?: string }
) {
  const rows = await db
    .insert(projects)
    .values({
      userId,
      name: data.name,
      description: data.description,
      status: data.status ?? "active",
    })
    .returning();
  return rows[0];
}

export async function updateProject(
  userId: string,
  projectId: string,
  data: Partial<{ name: string; description: string; status: string }>
) {
  const rows = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteProject(userId: string, projectId: string) {
  await db
    .delete(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)));
}
