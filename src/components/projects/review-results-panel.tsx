'use client';

import { useState } from 'react';
import { Badge, type TaskPriority } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ReviewData {
  summary: string;
  nextActionTaskId: string;
  risks: string[];
  gaps: Array<{ title: string; description: string }>;
  rebalance: Array<{
    taskId: string;
    suggestedPriority: 'low' | 'medium' | 'high';
    rationale: string;
  }>;
}

interface TaskStub {
  id: string;
  title: string;
}

interface ReviewResultsPanelProps {
  projectId: string;
  review: ReviewData;
  tasks: TaskStub[];
  onDismiss: () => void;
  onMutated: () => void;
}

export function ReviewResultsPanel({
  projectId,
  review,
  tasks,
  onDismiss,
  onMutated,
}: ReviewResultsPanelProps) {
  const [settingNextAction, setSettingNextAction] = useState(false);
  const [applyingRebalance, setApplyingRebalance] = useState(false);
  const [addingGapIdx, setAddingGapIdx] = useState<number | null>(null);
  const [addedGapIdxs, setAddedGapIdxs] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  const titleMap = new Map(tasks.map((t) => [t.id, t.title]));
  const nextActionTitle = titleMap.get(review.nextActionTaskId) ?? review.nextActionTaskId;

  async function handleSetNextAction() {
    setSettingNextAction(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/next-action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: review.nextActionTaskId }),
      });
      if (!res.ok) throw new Error();
      onMutated();
    } catch {
      setError('Failed to set next action');
    } finally {
      setSettingNextAction(false);
    }
  }

  async function handleApplyRebalance() {
    setApplyingRebalance(true);
    setError('');
    try {
      for (const suggestion of review.rebalance) {
        const res = await fetch(`/api/tasks/${suggestion.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: suggestion.suggestedPriority }),
        });
        if (!res.ok) throw new Error();
      }
      onMutated();
    } catch {
      setError('Failed to apply rebalance suggestions');
    } finally {
      setApplyingRebalance(false);
    }
  }

  async function handleAddGap(gap: { title: string; description: string }, idx: number) {
    setAddingGapIdx(idx);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: gap.title,
          description: gap.description,
          aiGenerated: true,
        }),
      });
      if (!res.ok) throw new Error();
      setAddedGapIdxs((prev) => new Set(prev).add(idx));
      onMutated();
    } catch {
      setError(`Failed to add "${gap.title}"`);
    } finally {
      setAddingGapIdx(null);
    }
  }

  return (
    <Card className="p-4 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold text-gray-900">Review results</p>
        <button
          onClick={onDismiss}
          className="text-sm text-gray-400 hover:text-gray-600"
          type="button"
          aria-label="Dismiss review"
        >
          ✕
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Summary */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Summary</p>
        <p className="text-sm text-gray-700">{review.summary}</p>
      </div>

      {/* Next action */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
          Next Action
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-gray-900">{nextActionTitle}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSetNextAction}
            loading={settingNextAction}
            type="button"
          >
            Set as next action
          </Button>
        </div>
      </div>

      {/* Rebalance suggestions */}
      {review.rebalance.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Rebalance suggestions
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleApplyRebalance}
              loading={applyingRebalance}
              type="button"
            >
              Apply all
            </Button>
          </div>
          <ul className="space-y-2">
            {review.rebalance.map((s) => (
              <li key={s.taskId} className="rounded bg-gray-50 p-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">
                    {titleMap.get(s.taskId) ?? s.taskId}
                  </span>
                  <span className="text-gray-400">→</span>
                  {/* suggestedPriority is constrained by Zod validation on the AI response */}
                  <Badge variant={s.suggestedPriority as TaskPriority} />
                </div>
                <p className="mt-1 text-xs text-gray-500">{s.rationale}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gap tasks */}
      {review.gaps.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Suggested missing tasks
          </p>
          <ul className="space-y-2">
            {review.gaps.map((gap, idx) => (
              <li
                key={idx}
                className="flex items-start justify-between gap-3 rounded bg-gray-50 p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{gap.title}</p>
                  {gap.description && (
                    <p className="mt-0.5 text-xs text-gray-500">{gap.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddGap(gap, idx)}
                  loading={addingGapIdx === idx}
                  disabled={addedGapIdxs.has(idx) || addingGapIdx === idx}
                  type="button"
                >
                  {addedGapIdxs.has(idx) ? 'Added' : 'Add'}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-1">
        <Button variant="ghost" size="sm" onClick={onDismiss} type="button">
          Dismiss
        </Button>
      </div>
    </Card>
  );
}
