import { type ProjectAiReview } from '@/db/schema';

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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-600">
          Plan Health
        </p>
        <p className="text-sm text-zinc-500">
          No review yet. Run a review to get plan health insights.
        </p>
      </div>
    );
  }

  const gapCount = review.gapsJson.length;
  const isHealthy = blockedTaskCount === 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
          Plan Health
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isHealthy
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-amber-500/15 text-amber-400'
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              isHealthy ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          {isHealthy ? 'On track' : 'Needs attention'}
        </span>
      </div>

      {/* Summary */}
      <p className="mb-4 text-sm leading-relaxed text-zinc-300">{review.summary}</p>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-zinc-400">
            <span className="font-semibold text-zinc-200">{readyTaskCount}</span> ready
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              blockedTaskCount > 0 ? 'bg-amber-400' : 'bg-zinc-600'
            }`}
          />
          <span className="text-zinc-400">
            <span
              className={`font-semibold ${
                blockedTaskCount > 0 ? 'text-amber-400' : 'text-zinc-200'
              }`}
            >
              {blockedTaskCount}
            </span>{' '}
            blocked
          </span>
        </div>
        {gapCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-zinc-600" />
            <span className="text-zinc-400">
              <span className="font-semibold text-zinc-200">{gapCount}</span>{' '}
              {gapCount === 1 ? 'gap' : 'gaps'} identified
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
