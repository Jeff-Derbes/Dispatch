import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Dispatch</h1>
        <p className="mt-2 text-gray-500">Personal project and task tracker</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/sign-in"
            className="rounded-md bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
