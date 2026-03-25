import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export function Nav() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="font-semibold text-gray-900 hover:text-indigo-600"
        >
          Dispatch
        </Link>
        <UserButton />
      </div>
    </nav>
  );
}
