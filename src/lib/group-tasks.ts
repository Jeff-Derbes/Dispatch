import { type ComputedStatus } from "./task-state";

export interface GroupableTask {
  id: string;
  computedStatus: ComputedStatus;
  recommendedNext: boolean;
  priority: string; // "low" | "medium" | "high"
  position: number;
}

export interface GroupedTasks<T extends GroupableTask> {
  ready: T[];
  blocked: T[];
  in_progress: T[];
  done: T[];
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Splits an enriched task list into four ordered buckets.
 *
 * ready     — recommendedNext first, then priority high→low, then position asc
 * blocked   — unsorted (natural order)
 * in_progress — unsorted (natural order)
 * done      — unsorted (natural order)
 */
export function groupTasks<T extends GroupableTask>(tasks: T[]): GroupedTasks<T> {
  const groups: GroupedTasks<T> = {
    ready: [],
    blocked: [],
    in_progress: [],
    done: [],
  };

  for (const task of tasks) {
    groups[task.computedStatus].push(task);
  }

  groups.ready.sort((a, b) => {
    if (a.recommendedNext !== b.recommendedNext) {
      return a.recommendedNext ? -1 : 1;
    }
    const pa = PRIORITY_RANK[a.priority] ?? 1;
    const pb = PRIORITY_RANK[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return a.position - b.position;
  });

  return groups;
}
