import { and, asc, eq } from "drizzle-orm";
import { db } from "../index";
import { tasks } from "../schema";

export async function getTaskById(userId: string, taskId: string) {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)));
  return rows[0] ?? null;
}

export async function getProjectTasks(userId: string, projectId: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.projectId, projectId)))
    .orderBy(asc(tasks.position), asc(tasks.priority));
}

export async function createTask(
  userId: string,
  projectId: string,
  data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
  }
) {
  const rows = await db
    .insert(tasks)
    .values({
      userId,
      projectId,
      title: data.title,
      description: data.description,
      status: data.status ?? "backlog",
      priority: data.priority ?? "medium",
    })
    .returning();
  return rows[0];
}

export async function updateTask(
  userId: string,
  taskId: string,
  data: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    position: number;
  }>
) {
  const rows = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteTask(userId: string, taskId: string) {
  await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)));
}

export async function reorderTasks(
  userId: string,
  updates: { id: string; position: number }[]
) {
  await db.transaction(async (tx) => {
    for (const { id, position } of updates) {
      await tx
        .update(tasks)
        .set({ position, updatedAt: new Date() })
        .where(and(eq(tasks.userId, userId), eq(tasks.id, id)));
    }
  });
}
