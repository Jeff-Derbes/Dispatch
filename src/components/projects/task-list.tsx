'use client';

import { useRouter } from 'next/navigation';
import { type Task } from '@/db/schema';
import { TaskItem } from './task-item';
import { AddTaskForm } from './add-task-form';

interface TaskListProps {
  projectId: string;
  tasks: Task[];
}

export function TaskList({ projectId, tasks }: TaskListProps) {
  const router = useRouter();

  function handleMutation() {
    router.refresh();
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
        Tasks ({tasks.length})
      </h2>

      {tasks.length === 0 ? (
        <p className="py-4 text-sm text-gray-400">
          No tasks yet. Add one below.
        </p>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onMutated={handleMutation} />
          ))}
        </div>
      )}

      <div className="mt-4">
        <AddTaskForm projectId={projectId} onAdded={handleMutation} />
      </div>
    </div>
  );
}
