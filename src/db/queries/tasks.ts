import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../index";
import { taskDependencies, tasks, type Task } from "../schema";
import { computeAllTaskStatuses, type ComputedStatus } from "@/lib/task-state";

export type EnrichedTask = Task & {
  dependencies: string[]; // dependsOnTaskId values
  computedStatus: ComputedStatus;
};

export async function getTaskById(userId: string, taskId: string) {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)));
  return rows[0] ?? null;
}

export async function getProjectTasks(
  userId: string,
  projectId: string
): Promise<EnrichedTask[]> {
  const [rawTasks, deps] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.projectId, projectId)))
      .orderBy(asc(tasks.position)),
    db
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
      ),
  ]);

  const depMap = new Map<string, string[]>();
  for (const { taskId, dependsOnTaskId } of deps) {
    const arr = depMap.get(taskId) ?? [];
    arr.push(dependsOnTaskId);
    depMap.set(taskId, arr);
  }

  const tasksWithDeps = rawTasks.map((t) => ({
    ...t,
    dependencies: depMap.get(t.id) ?? [],
  }));

  return computeAllTaskStatuses(tasksWithDeps);
}

/**
 * Returns all non-done tasks for a project with fields needed by the AI review endpoint.
 */
export async function getNonDoneProjectTasks(
  userId: string,
  projectId: string
) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      effort: tasks.effort,
      impact: tasks.impact,
      phase: tasks.phase,
      blockedReason: tasks.blockedReason,
      status: tasks.status,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.projectId, projectId),
        ne(tasks.status, "done")
      )
    )
    .orderBy(asc(tasks.position));
}

export async function createTask(
  userId: string,
  projectId: string,
  data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    aiGenerated?: boolean;
    effort?: string;
    impact?: string;
    phase?: string | null;
    blockedReason?: string | null;
  }
) {
  const [{ maxPos }] = await db
    .select({ maxPos: sql<number | null>`max(${tasks.position})` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.projectId, projectId)));

  const position = (maxPos ?? -1) + 1;

  const rows = await db
    .insert(tasks)
    .values({
      userId,
      projectId,
      title: data.title,
      description: data.description,
      status: data.status ?? "backlog",
      priority: data.priority ?? "medium",
      position,
      aiGenerated: data.aiGenerated ?? false,
      effort: data.effort ?? "medium",
      impact: data.impact ?? "medium",
      phase: data.phase ?? null,
      blockedReason: data.blockedReason ?? null,
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
    effort: string;
    impact: string;
    phase: string | null;
    blockedReason: string | null;
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

export async function getTaskCountsByProjectIds(
  userId: string,
  projectIds: string[]
): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};

  const rows = await db
    .select({
      projectId: tasks.projectId,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), inArray(tasks.projectId, projectIds)))
    .groupBy(tasks.projectId);

  return Object.fromEntries(rows.map((r) => [r.projectId, Number(r.count)]));
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

/**
 * Atomically clears recommended_next on all project tasks, then optionally
 * sets it on a single task. Runs in a single transaction.
 */
export async function setNextAction(
  projectId: string,
  taskId: string | null,
  userId: string
) {
  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({ recommendedNext: false })
      .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)));

    if (taskId) {
      await tx
        .update(tasks)
        .set({ recommendedNext: true })
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
    }
  });
}
