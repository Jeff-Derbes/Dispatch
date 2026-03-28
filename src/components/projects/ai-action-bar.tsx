'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlanGenerationPanel } from './plan-generation-panel';
import { ReviewResultsPanel } from './review-results-panel';

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

interface AiActionBarProps {
  projectId: string;
  projectName: string;
  initialDescription?: string | null;
  tasks: TaskStub[];
}

type ReviewMode = 'review' | 'rebalance';

export function AiActionBar({
  projectId,
  projectName,
  initialDescription,
  tasks,
}: AiActionBarProps) {
  const router = useRouter();
  const [showPlanPanel, setShowPlanPanel] = useState(false);
  const [activeReview, setActiveReview] = useState<ReviewData | null>(null);
  const [loadingReview, setLoadingReview] = useState<ReviewMode | null>(null);
  const [reviewError, setReviewError] = useState('');

  function handleMutation() {
    router.refresh();
  }

  async function runReview(mode: ReviewMode) {
    setLoadingReview(mode);
    setActiveReview(null);
    setReviewError('');
    setShowPlanPanel(false);

    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, mode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setReviewError(data.error ?? 'Review failed');
        return;
      }

      const data = await res.json() as { data: ReviewData };
      setActiveReview(data.data);
      // Refresh to show the updated recommended_next task in the task list
      router.refresh();
    } catch {
      setReviewError('Failed to reach the AI service');
    } finally {
      setLoadingReview(null);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      {/* Inline panels — shown above the action buttons */}
      {showPlanPanel && (
        <PlanGenerationPanel
          projectId={projectId}
          projectName={projectName}
          initialDescription={initialDescription}
          onClose={() => setShowPlanPanel(false)}
          onTasksAdded={handleMutation}
        />
      )}

      {activeReview && (
        <ReviewResultsPanel
          projectId={projectId}
          review={activeReview}
          tasks={tasks}
          onDismiss={() => setActiveReview(null)}
          onMutated={handleMutation}
        />
      )}

      {reviewError && (
        <p className="text-xs text-red-600">{reviewError}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowPlanPanel((v) => !v);
            setActiveReview(null);
          }}
          type="button"
        >
          ✦ Generate plan
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => runReview('review')}
          loading={loadingReview === 'review'}
          disabled={loadingReview !== null}
          type="button"
        >
          Review plan
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => runReview('rebalance')}
          loading={loadingReview === 'rebalance'}
          disabled={loadingReview !== null}
          type="button"
        >
          Rebalance
        </Button>
      </div>
    </div>
  );
}
