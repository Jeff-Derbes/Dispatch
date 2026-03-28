import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserProjects } from '@/db/queries/projects';
import { ProjectGrid } from '@/components/dashboard/project-grid';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const projects = await getUserProjects(userId);

  return <ProjectGrid projects={projects} />;
}
