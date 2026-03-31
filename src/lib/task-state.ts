export type ComputedStatus = "ready" | "blocked" | "in_progress" | "done";

export interface TaskForStatusComputation {
  id: string;
  status: string; // "backlog" | "in_progress" | "done"
  blockedReason: string | null;
  dependencies: string[]; // dependsOnTaskId values
}

/**
 * Derives the computed status for a single task.
 *
 * Rules (in priority order):
 * 1. "done"       — task.status === "done"
 * 2. "blocked"    — blockedReason is set OR any dependency's status is not "done"
 * 3. "in_progress" — task.status === "in_progress" (and not blocked)
 * 4. "ready"      — backlog task with no blockers
 */
export function computeTaskStatus(
  task: TaskForStatusComputation,
  taskStatusMap: Map<string, string>
): ComputedStatus {
  if (task.status === "done") return "done";

  if (task.blockedReason) return "blocked";

  const hasUnresolvedDep = task.dependencies.some(
    (depId) => taskStatusMap.get(depId) !== "done"
  );
  if (hasUnresolvedDep) return "blocked";

  if (task.status === "in_progress") return "in_progress";

  return "ready";
}

/**
 * Computes computedStatus for every task in the list.
 * Builds the status map internally so callers don't need to.
 */
export function computeAllTaskStatuses<T extends TaskForStatusComputation>(
  tasks: T[]
): Array<T & { computedStatus: ComputedStatus }> {
  const statusMap = new Map(tasks.map((t) => [t.id, t.status]));
  return tasks.map((task) => ({
    ...task,
    computedStatus: computeTaskStatus(task, statusMap),
  }));
}
