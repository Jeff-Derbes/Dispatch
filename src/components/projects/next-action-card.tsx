'use client';

import { useState } from 'react';
import { type Task } from '@/db/schema';
import { Badge, type TaskEffort, type TaskPriority } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
      <Card className="p-4">
        <p className="text-sm font-medium text-gray-500">Next Action</p>
        <p className="mt-1 text-sm text-gray-400">
          No next action yet. Review this plan to generate one.
        </p>
      </Card>
    );
  }

  // Truncate aiRationale to ~120 chars
  const rationale = task.aiRationale
    ? task.aiRationale.length > 120
      ? task.aiRationale.slice(0, 117) + '…'
      : task.aiRationale
    : null;

  return (
    <Card className="p-4">
      <p className="mb-2 text-sm font-medium text-gray-500">Next Action</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-gray-900">{task.title}</span>
        {/* effort badge — values are constrained by Zod validation on write */}
        <Badge variant={task.effort as TaskEffort} />
        {/* impact shares the same scale as priority */}
        <Badge variant={task.impact as TaskPriority} />
      </div>
      {rationale && (
        <p className="mt-1 text-sm text-gray-500">{rationale}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
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
    </Card>
  );
}
