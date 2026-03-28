import { type ProjectAiReview } from '@/db/schema';
import { Card } from '@/components/ui/card';

interface PlanHealthCardProps {
  review: ProjectAiReview | null;
  blockedTaskCount: number;
  readyTaskCount: number;
}

export function PlanHealthCard({
  review,
  blockedTaskCount,
  readyTaskCount,
}: PlanHealthCardProps) {
  if (!review) {
    return (
      <Card className="p-4">
        <p className="text-sm font-medium text-gray-500">Plan Health</p>
        <p className="mt-1 text-sm text-gray-400">
          No review yet. Run a review to get plan health insights.
        </p>
      </Card>
    );
  }

  const gapCount = review.gapsJson.length;

  return (
    <Card className="p-4">
      <p className="mb-2 text-sm font-medium text-gray-500">Plan Health</p>
      <p className="text-sm text-gray-700">{review.summary}</p>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
        <span>
          <span className="font-medium text-gray-700">{readyTaskCount}</span> ready
        </span>
        <span>
          <span className={`font-medium ${blockedTaskCount > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
            {blockedTaskCount}
          </span>{' '}
          blocked
        </span>
        {gapCount > 0 && (
          <span>
            <span className="font-medium text-gray-700">{gapCount}</span>{' '}
            {gapCount === 1 ? 'gap' : 'gaps'} identified
          </span>
        )}
      </div>
    </Card>
  );
}
