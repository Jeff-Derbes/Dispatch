'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ProjectSummary } from '@/db/queries/projects';
import { Badge, type ProjectStatus } from '@/components/ui/badge';
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Projects</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {projects.length === 0
              ? 'Get started by creating your first project.'
              : `${projects.length} project${projects.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>New Project</Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 py-20 text-center">
          <div className="mb-3 text-xl text-zinc-600">✦</div>
          <p className="text-base font-medium text-zinc-200">No projects yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-zinc-500">
            Create a project to start organizing tasks and use AI-assisted planning.
          </p>
          <Button className="mt-6" onClick={() => setShowModal(true)}>
            Create your first project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="group relative flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:border-indigo-500/30 hover:bg-zinc-800/60 hover:shadow-lg hover:shadow-indigo-950/20">
                {/* Top: name + status */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug text-zinc-100 transition-colors group-hover:text-indigo-300 line-clamp-2">
                    {project.name}
                  </h2>
                  {/* project.status is constrained by Zod validation on write */}
                  <Badge variant={project.status as ProjectStatus} />
                </div>

                {/* Description */}
                {project.description ? (
                  <p className="mb-4 line-clamp-2 text-sm text-zinc-500">
                    {project.description}
                  </p>
                ) : (
                  <p className="mb-4 text-sm italic text-zinc-700">No description</p>
                )}

                {/* Next action */}
                {project.nextActionTitle && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-indigo-400">
                    <span className="text-indigo-500">▶</span>
                    <span className="truncate">{project.nextActionTitle}</span>
                  </div>
                )}

                {/* Footer stats */}
                <div className="mt-auto flex items-center justify-between border-t border-zinc-800 pt-3 text-xs text-zinc-600">
                  <div className="flex items-center gap-3">
                    <span>
                      <span className="font-medium text-zinc-400">
                        {project.completionState.done}
                      </span>
                      {' / '}
                      {project.completionState.total} done
                    </span>
                    {project.blockedTaskCount > 0 && (
                      <span className="font-medium text-amber-500">
                        {project.blockedTaskCount} blocked
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-700">
                    {new Date(project.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </span>
                </div>
              </div>
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
