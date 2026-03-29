import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100">Dispatch</h1>
        <p className="mt-2 text-zinc-500">Personal project and task tracker</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/sign-in"
            className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2 font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
