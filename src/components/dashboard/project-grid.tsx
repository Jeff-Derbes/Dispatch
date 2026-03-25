'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type Project } from '@/db/schema';
import { Badge, type ProjectStatus } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NewProjectModal } from './new-project-modal';

type ProjectWithCount = Project & { taskCount: number };

interface ProjectGridProps {
  projects: ProjectWithCount[];
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  function handleCreated() {
    setShowModal(false);
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <Button onClick={() => setShowModal(true)}>New Project</Button>
      </div>

      {projects.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <p className="text-lg font-medium">No projects yet</p>
          <p className="mt-1 text-sm">Create your first project to get started.</p>
          <Button className="mt-4" onClick={() => setShowModal(true)}>
            New Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="cursor-pointer p-4 transition-all hover:border-indigo-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="truncate font-medium text-gray-900">
                    {project.name}
                  </h2>
                  {/* project.status is constrained by Zod validation on write */}
                  <Badge variant={project.status as ProjectStatus} />
                </div>
                {project.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {project.description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {project.taskCount}{' '}
                    {project.taskCount === 1 ? 'task' : 'tasks'}
                  </span>
                  <span>
                    Updated{' '}
                    {project.updatedAt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
