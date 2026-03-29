'use client';

import { useState } from 'react';
import { type Task } from '@/db/schema';
import { Badge, type TaskEffort, type TaskPriority } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NextActionCardProps {
  task: Task | null;
  onMarkInProgress: () => void; // called after successful mutation
  onOpenTask: (id: string) => void;
}

export function NextActionCard({
  task,
  onMarkInProgress,
  onOpenTask,
}: NextActionCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleMarkInProgress() {
    if (!task) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      if (!res.ok) throw new Error();
      onMarkInProgress();
    } catch {
      setError('Failed to update task');
    } finally {
      setLoading(false);
    }
  }

  if (!task) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-600">
          Next Action
        </p>
        <p className="text-sm text-zinc-500">
          No next action yet. Review this plan to generate one.
        </p>
      </div>
    );
  }

  // Truncate aiRationale to ~140 chars
  const rationale = task.aiRationale
    ? task.aiRationale.length > 140
      ? task.aiRationale.slice(0, 137) + '…'
      : task.aiRationale
    : null;

  return (
    <div className="relative rounded-xl border border-indigo-500/25 bg-linear-to-br from-indigo-950/50 via-zinc-900 to-zinc-900 p-6 shadow-lg shadow-indigo-950/30 ring-1 ring-inset ring-white/4">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Next Action
          </p>
          {task.aiRationale && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
              <span aria-hidden>✦</span> AI suggested
            </span>
          )}
        </div>
        {task.status === 'in_progress' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            In progress
          </span>
        )}
      </div>

      {/* Task title */}
      <h2 className="mb-3 text-xl font-semibold leading-snug text-zinc-100">
        {task.title}
      </h2>

      {/* Badges */}
      <div className="mb-4 flex flex-wrap gap-2">
        {/* effort badge — values constrained by Zod on write */}
        <Badge variant={task.effort as TaskEffort} />
        {/* impact shares the same scale as priority */}
        <Badge variant={task.impact as TaskPriority} />
      </div>

      {/* AI rationale */}
      {rationale && (
        <p className="mb-5 text-sm leading-relaxed text-zinc-500">{rationale}</p>
      )}

      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleMarkInProgress}
          loading={loading}
          disabled={task.status === 'in_progress'}
          type="button"
        >
          {task.status === 'in_progress' ? 'In progress' : 'Mark in progress'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenTask(task.id)}
          type="button"
        >
          Open task
        </Button>
      </div>
    </div>
  );
}
