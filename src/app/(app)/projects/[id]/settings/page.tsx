import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProjectById } from '@/db/queries/projects';
import { SettingsForm } from '@/components/projects/settings-form';

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;
  const project = await getProjectById(userId, id);
  if (!project) notFound();

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link
          href={`/projects/${id}`}
          className="text-sm text-zinc-600 transition-colors hover:text-zinc-300"
        >
          ← Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
          Project Settings
        </h1>
      </div>
      <SettingsForm project={project} />
    </div>
  );
}
