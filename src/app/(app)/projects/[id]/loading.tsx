export default function ProjectLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="min-w-0">
          <div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>
        <div className="h-4 w-14 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Task list header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-7 w-28 animate-pulse rounded-md bg-gray-200" />
          <div className="h-7 w-32 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>

      {/* Task rows */}
      <div className="space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white p-3"
          >
            <div className="h-5 w-16 flex-shrink-0 animate-pulse rounded-full bg-gray-200" />
            <div className="h-4 min-w-0 flex-1 animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-14 flex-shrink-0 animate-pulse rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
