'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-lg font-medium text-zinc-100">Something went wrong</p>
      <p className="mt-1 text-sm text-zinc-500">{error.message}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Try again
      </button>
    </div>
  );
}
