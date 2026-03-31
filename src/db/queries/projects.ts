import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import {
  projectAiReviews,
  projects,
  taskDependencies,
  tasks,
  type Project,
  type ProjectAiReview,
} from "../schema";
import { computeAllTaskStatuses } from "@/lib/task-state";
import { type EnrichedTask } from "./tasks";

// ─── Dashboard summary type ───────────────────────────────────────────────────

export type ProjectSummary = Project & {
  nextActionTitle: string | null;
  blockedTaskCount: number;
  completionState: { done: number; total: number };
};

// ─── Project page detail type ─────────────────────────────────────────────────

export type ProjectDetails = {
  project: Project;
  tasks: EnrichedTask[];
  latestReview: ProjectAiReview | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all projects for a user with per-project dashboard summary fields.
 * Computed columns use SQL correlated subqueries so they scale across many projects.
 */
export async function getUserProjects(userId: string): Promise<ProjectSummary[]> {
  const rows = await db
    .select({
      id: projects.id,
      userId: projects.userId,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      nextActionTitle: sql<string | null>`(
        SELECT t.title FROM tasks t
        WHERE t.project_id = ${projects.id}
          AND t.user_id   = ${projects.userId}
          AND t.recommended_next = true
        LIMIT 1
      )`,
      blockedTaskCount: sql<number>`(
        SELECT COUNT(*)::int FROM tasks t
        WHERE t.project_id = ${projects.id}
          AND t.user_id   = ${projects.userId}
          AND t.status   != 'done'
          AND (
            (t.blocked_reason IS NOT NULL AND t.blocked_reason != '')
            OR EXISTS (
              SELECT 1 FROM task_dependencies td
              JOIN tasks dep ON dep.id = td.depends_on_task_id
              WHERE td.task_id = t.id AND dep.status != 'done'
            )
          )
      )`,
      doneCount: sql<number>`(
        SELECT COUNT(*)::int FROM tasks t
        WHERE t.project_id = ${projects.id}
          AND t.user_id   = ${projects.userId}
          AND t.status   = 'done'
      )`,
      totalCount: sql<number>`(
        SELECT COUNT(*)::int FROM tasks t
        WHERE t.project_id = ${projects.id}
          AND t.user_id   = ${projects.userId}
      )`,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));

  return rows.map(({ doneCount, totalCount, ...rest }) => ({
    ...rest,
    completionState: { done: doneCount, total: totalCount },
  }));
}

export async function getProjectById(userId: string, projectId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)));
  return rows[0] ?? null;
}

/**
 * Loads everything needed for the project page in a single function call.
 * All four DB queries run in parallel via Promise.all.
 *
 * Returns null if the project does not exist or does not belong to userId.
 */
export async function getProjectDetails(
  userId: string,
  projectId: string
): Promise<ProjectDetails | null> {
  const [projectRows, rawTasks, deps, reviewRows] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.id, projectId))),
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
    db
      .select()
      .from(projectAiReviews)
      .where(
        and(
          eq(projectAiReviews.userId, userId),
          eq(projectAiReviews.projectId, projectId)
        )
      )
      .orderBy(desc(projectAiReviews.createdAt))
      .limit(1),
  ]);

  const project = projectRows[0] ?? null;
  if (!project) return null;

  const depMap = new Map<string, string[]>();
  for (const { taskId, dependsOnTaskId } of deps) {
    const arr = depMap.get(taskId) ?? [];
    arr.push(dependsOnTaskId);
    depMap.set(taskId, arr);
  }

  const enrichedTasks = computeAllTaskStatuses(
    rawTasks.map((t) => ({
      ...t,
      dependencies: depMap.get(t.id) ?? [],
    }))
  );

  return {
    project,
    tasks: enrichedTasks,
    latestReview: reviewRows[0] ?? null,
  };
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
  data: Partial<{ name: string; description: string | null; status: string }>
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
