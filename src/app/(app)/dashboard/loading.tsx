export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="h-8 w-24 animate-pulse rounded-lg bg-zinc-800" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-800" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="h-5 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="h-5 w-14 animate-pulse rounded-md bg-zinc-800" />
            </div>
            <div className="h-4 w-full animate-pulse rounded bg-zinc-800/70" />
            <div className="mt-1.5 h-4 w-3/4 animate-pulse rounded bg-zinc-800/70" />
            <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-800/70" />
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-800/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
