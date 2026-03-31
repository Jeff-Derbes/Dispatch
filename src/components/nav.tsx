import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="font-semibold tracking-tight text-zinc-100 transition-colors hover:text-indigo-400"
        >
          Dispatch
        </Link>
        <UserButton />
      </div>
    </nav>
  );
}
