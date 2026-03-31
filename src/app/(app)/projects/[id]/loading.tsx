export default function ProjectLoading() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-zinc-800" />

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-48 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-5 w-14 animate-pulse rounded-md bg-zinc-800" />
          </div>
        </div>
        <div className="h-4 w-14 animate-pulse rounded bg-zinc-800" />
      </div>

      {/* Next action card skeleton */}
      <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-zinc-800" />
        <div className="mb-3 h-7 w-56 animate-pulse rounded bg-zinc-800" />
        <div className="mb-4 flex gap-2">
          <div className="h-5 w-14 animate-pulse rounded-md bg-zinc-800" />
          <div className="h-5 w-14 animate-pulse rounded-md bg-zinc-800" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-32 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-7 w-24 animate-pulse rounded-lg bg-zinc-800" />
        </div>
      </div>

      {/* Plan health skeleton */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-zinc-800" />
        </div>
        <div className="h-4 w-full animate-pulse rounded bg-zinc-800/70" />
        <div className="mt-1.5 h-4 w-2/3 animate-pulse rounded bg-zinc-800/70" />
      </div>

      {/* Task rows */}
      <div className="space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
          >
            <div className="h-5 w-14 shrink-0 animate-pulse rounded-md bg-zinc-800" />
            <div className="h-4 min-w-0 flex-1 animate-pulse rounded bg-zinc-800" />
            <div className="h-5 w-12 shrink-0 animate-pulse rounded-md bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
