'use client';

import { useRouter } from 'next/navigation';
import { type EnrichedTask } from '@/db/queries/tasks';
import { groupTasks } from '@/lib/group-tasks';
import { TaskItem, type TaskDep } from './task-item';
import { AddTaskForm } from './add-task-form';

interface RawDep {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
}

interface TaskListGroupedProps {
  projectId: string;
  tasks: EnrichedTask[];
  allDeps: RawDep[];
  // When set, that task row will be auto-expanded and scrolled into view
  expandedTaskId?: string | null;
}

const SECTION_LABELS: Record<string, string> = {
  ready: 'Ready',
  blocked: 'Blocked',
  in_progress: 'In Progress',
  done: 'Done',
};

export function TaskListGrouped({
  projectId,
  tasks,
  allDeps,
  expandedTaskId,
}: TaskListGroupedProps) {
  const router = useRouter();

  function handleMutation() {
    router.refresh();
  }

  const groups = groupTasks(tasks);

  // Build title map for dependency label lookups
  const titleMap = new Map(tasks.map((t) => [t.id, t.title]));

  // Build per-task dep list: [{ id (row ID), dependsOnTitle }]
  function getTaskDeps(taskId: string): TaskDep[] {
    return allDeps
      .filter((d) => d.taskId === taskId)
      .map((d) => ({
        id: d.id,
        dependsOnTitle: titleMap.get(d.dependsOnTaskId) ?? 'Unknown task',
      }));
  }

  const sections: Array<{ key: keyof typeof groups; tasks: EnrichedTask[] }> = [
    { key: 'ready', tasks: groups.ready },
    { key: 'blocked', tasks: groups.blocked },
    { key: 'in_progress', tasks: groups.in_progress },
    { key: 'done', tasks: groups.done },
  ];

  const totalCount = tasks.length;

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
        Tasks ({totalCount})
      </h2>

      {totalCount === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-10 text-center">
          <p className="text-sm font-medium text-gray-900">No tasks yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Add a task below, or use Generate plan to build one with AI.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map(({ key, tasks: sectionTasks }) => {
            if (sectionTasks.length === 0) return null;
            return (
              <div key={key}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {SECTION_LABELS[key]} ({sectionTasks.length})
                </p>
                <div className="space-y-1">
                  {sectionTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      deps={getTaskDeps(task.id)}
                      projectId={projectId}
                      defaultExpanded={expandedTaskId === task.id}
                      onMutated={handleMutation}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <AddTaskForm projectId={projectId} onAdded={handleMutation} />
      </div>
    </div>
  );
}
