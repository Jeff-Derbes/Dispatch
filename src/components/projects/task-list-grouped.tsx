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

const SECTION_ACCENT: Record<string, string> = {
  ready: 'bg-emerald-400',
  blocked: 'bg-amber-400',
  in_progress: 'bg-indigo-400',
  done: 'bg-zinc-600',
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
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-600">
        Tasks ({totalCount})
      </h2>

      {totalCount === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 py-10 text-center">
          <p className="text-sm font-medium text-zinc-400">No tasks yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Add a task below, or use Generate plan to build one with AI.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map(({ key, tasks: sectionTasks }) => {
            if (sectionTasks.length === 0) return null;
            return (
              <div key={key}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${SECTION_ACCENT[key]}`}
                  />
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {SECTION_LABELS[key]}
                    <span className="ml-1.5 font-normal text-zinc-700">
                      ({sectionTasks.length})
                    </span>
                  </p>
                </div>
                <div className="space-y-1.5">
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

      <div className="mt-5">
        <AddTaskForm projectId={projectId} onAdded={handleMutation} />
      </div>
    </div>
  );
}
