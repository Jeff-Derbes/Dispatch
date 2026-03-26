import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { taskDependencies } from "../schema";

export async function getTaskDependencies(userId: string, projectId: string) {
  return db
    .select()
    .from(taskDependencies)
    .where(
      and(
        eq(taskDependencies.userId, userId),
        eq(taskDependencies.projectId, projectId)
      )
    );
}

export async function createDependency(data: {
  projectId: string;
  userId: string;
  taskId: string;
  dependsOnTaskId: string;
}) {
  const rows = await db
    .insert(taskDependencies)
    .values({
      projectId: data.projectId,
      userId: data.userId,
      taskId: data.taskId,
      dependsOnTaskId: data.dependsOnTaskId,
    })
    .returning();
  return rows[0];
}

export async function deleteDependency(userId: string, dependencyId: string) {
  await db
    .delete(taskDependencies)
    .where(
      and(
        eq(taskDependencies.userId, userId),
        eq(taskDependencies.id, dependencyId)
      )
    );
}
