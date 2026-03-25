import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProjectById } from '@/db/queries/projects';
import { getProjectTasks } from '@/db/queries/tasks';
import { Badge, type ProjectStatus } from '@/components/ui/badge';
import { TaskList } from '@/components/projects/task-list';

const priorityOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;

  const [project, tasks] = await Promise.all([
    getProjectById(userId, id),
    getProjectTasks(userId, id),
  ]);

  if (!project) notFound();

  // Sort by priority (high → medium → low), then by position within each group
  const sortedTasks = [...tasks].sort((a, b) => {
    const pDiff =
      (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
    if (pDiff !== 0) return pDiff;
    return a.position - b.position;
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ← Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {/* project.status is constrained by Zod validation on write */}
            <Badge variant={project.status as ProjectStatus} />
          </div>
          {project.description && (
            <p className="mt-1 text-gray-500">{project.description}</p>
          )}
        </div>
        <Link
          href={`/projects/${id}/settings`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Settings
        </Link>
      </div>

      <TaskList projectId={id} tasks={sortedTasks} />
    </div>
  );
}
