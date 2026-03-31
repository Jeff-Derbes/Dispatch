export type DependencyEdge = {
  taskId: string;
  dependsOnTaskId: string;
};

/**
 * Pure BFS cycle detection. No DB calls.
 *
 * Returns true if adding the edge (taskId → dependsOnTaskId) would create a cycle
 * in the existing dependency graph. A cycle exists when dependsOnTaskId can already
 * reach taskId by following existing depends_on_task_id links.
 */
export function wouldCreateCycle(
  graph: DependencyEdge[],
  taskId: string,
  dependsOnTaskId: string
): boolean {
  // Build adjacency map once: node → its prerequisites
  const adj = new Map<string, string[]>();
  for (const { taskId: t, dependsOnTaskId: dep } of graph) {
    const arr = adj.get(t) ?? [];
    arr.push(dep);
    adj.set(t, arr);
  }

  const visited = new Set<string>();
  const queue: string[] = [dependsOnTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const prereqs = adj.get(current) ?? [];
    queue.push(...prereqs);
  }

  return false;
}
