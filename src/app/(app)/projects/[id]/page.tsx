import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProjectDetails } from '@/db/queries/projects';
import { getTaskDependencies } from '@/db/queries/dependencies';
import { Badge, type ProjectStatus } from '@/components/ui/badge';
import { ProjectContent } from '@/components/projects/project-content';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;

  const [details, rawDeps] = await Promise.all([
    getProjectDetails(userId, id),
    getTaskDependencies(userId, id),
  ]);

  if (!details) notFound();

  const { project, tasks, latestReview } = details;

  // Pass only the fields that the client needs (avoids sending userId over the wire)
  const allDeps = rawDeps.map((d) => ({
    id: d.id,
    taskId: d.taskId,
    dependsOnTaskId: d.dependsOnTaskId,
  }));

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-zinc-600" aria-label="Breadcrumb">
        <Link href="/dashboard" className="transition-colors hover:text-zinc-300">
          Projects
        </Link>
        <span>/</span>
        <span className="text-zinc-400">{project.name}</span>
      </nav>

      {/* Project header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-3xl font-bold tracking-tight text-zinc-100">
              {project.name}
            </h1>
            {/* project.status is constrained by Zod validation on write */}
            <Badge variant={project.status as ProjectStatus} />
          </div>
          {project.description && (
            <p className="mt-2 text-zinc-500">{project.description}</p>
          )}
        </div>
        <Link
          href={`/projects/${id}/settings`}
          className="shrink-0 text-sm text-zinc-600 transition-colors hover:text-zinc-300"
        >
          Settings
        </Link>
      </div>

      {/* V2 execution cockpit — client component manages UI state */}
      <ProjectContent
        project={project}
        tasks={tasks}
        allDeps={allDeps}
        latestReview={latestReview}
      />
    </div>
  );
}
