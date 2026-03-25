import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserProjects } from '@/db/queries/projects';
import { getTaskCountsByProjectIds } from '@/db/queries/tasks';
import { ProjectGrid } from '@/components/dashboard/project-grid';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const projects = await getUserProjects(userId);
  const taskCounts = await getTaskCountsByProjectIds(
    userId,
    projects.map((p) => p.id),
  );

  const projectsWithCounts = projects.map((p) => ({
    ...p,
    taskCount: taskCounts[p.id] ?? 0,
  }));

  return <ProjectGrid projects={projectsWithCounts} />;
}
