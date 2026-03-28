import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { taskDependencies } from "../schema";
import type { DependencyEdge } from "@/lib/cycle-detection";

export async function getDependencyById(dependencyId: string) {
  const rows = await db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.id, dependencyId));
  return rows[0] ?? null;
}

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

/**
 * Returns all { taskId, dependsOnTaskId } pairs for a project.
 * Used as input to the review endpoint and cycle detection.
 */
export async function getProjectDependencyGraph(
  userId: string,
  projectId: string
): Promise<DependencyEdge[]> {
  return db
    .select({
      taskId: taskDependencies.taskId,
      dependsOnTaskId: taskDependencies.dependsOnTaskId,
    })
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
