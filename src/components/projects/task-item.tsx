'use client';

import { useEffect, useState } from 'react';
import { type Task } from '@/db/schema';
import { Badge, type TaskPriority, type TaskStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const statusCycle: TaskStatus[] = ['backlog', 'in_progress', 'done'];
const priorityCycle: TaskPriority[] = ['low', 'medium', 'high'];

interface TaskItemProps {
  task: Task;
  onMutated: () => void;
}

export function TaskItem({ task, onMutated }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState(task.description ?? '');
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingPriority, setLoadingPriority] = useState(false);
  const [loadingDesc, setLoadingDesc] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Sync description state when server data changes (after refresh)
  useEffect(() => {
    setDescription(task.description ?? '');
  }, [task.description]);

  async function cycleStatus() {
    const idx = statusCycle.indexOf(task.status as TaskStatus);
    const next = statusCycle[(idx + 1) % statusCycle.length];
    setLoadingStatus(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      onMutated();
    } catch {
      setError('Failed to update status');
    } finally {
      setLoadingStatus(false);
    }
  }

  async function cyclePriority() {
    const idx = priorityCycle.indexOf(task.priority as TaskPriority);
    const next = priorityCycle[(idx + 1) % priorityCycle.length];
    setLoadingPriority(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: next }),
      });
      if (!res.ok) throw new Error();
      onMutated();
    } catch {
      setError('Failed to update priority');
    } finally {
      setLoadingPriority(false);
    }
  }

  async function saveDescription() {
    setLoadingDesc(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error();
      onMutated();
    } catch {
      setError('Failed to save description');
    } finally {
      setLoadingDesc(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onMutated();
    } catch {
      setError('Failed to delete task');
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={cycleStatus}
          disabled={loadingStatus}
          className="flex-shrink-0 disabled:opacity-50"
          title="Click to cycle status"
          type="button"
        >
          {/* task.status is constrained by Zod validation on write */}
          <Badge variant={task.status as TaskStatus} />
        </button>

        <button
          onClick={() => setExpanded((e) => !e)}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-gray-900 hover:text-indigo-600"
          type="button"
        >
          {task.title}
        </button>

        <button
          onClick={cyclePriority}
          disabled={loadingPriority}
          className="flex-shrink-0 disabled:opacity-50"
          title="Click to cycle priority"
          type="button"
        >
          {/* task.priority is constrained by Zod validation on write */}
          <Badge variant={task.priority as TaskPriority} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-3 pb-3">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={3}
            className="mt-3"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={saveDescription}
              loading={loadingDesc}
              type="button"
            >
              Save
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
              type="button"
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
