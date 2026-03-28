'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ProjectSummary } from '@/db/queries/projects';
import { Badge, type ProjectStatus } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NewProjectModal } from './new-project-modal';

interface ProjectGridProps {
  projects: ProjectSummary[];
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
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-20 text-center">
          <p className="text-base font-medium text-gray-900">No projects yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
            Create a project to start organizing tasks and use AI-assisted planning.
          </p>
          <Button className="mt-5" onClick={() => setShowModal(true)}>
            Create your first project
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

                {/* Next action */}
                <p className="mt-2 truncate text-xs text-indigo-600">
                  {project.nextActionTitle
                    ? `▶ ${project.nextActionTitle}`
                    : 'No next action'}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-3">
                    {/* Completion indicator */}
                    <span>
                      {project.completionState.done} / {project.completionState.total} done
                    </span>
                    {/* Blocked count */}
                    {project.blockedTaskCount > 0 && (
                      <span className="text-amber-600">
                        {project.blockedTaskCount} blocked
                      </span>
                    )}
                  </div>
                  <span>
                    Updated{' '}
                    {new Date(project.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
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
