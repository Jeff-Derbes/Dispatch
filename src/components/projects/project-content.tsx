'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Project, type ProjectAiReview, type Task } from '@/db/schema';
import { type EnrichedTask } from '@/db/queries/tasks';
import { NextActionCard } from './next-action-card';
import { PlanHealthCard } from './plan-health-card';
import { TaskListGrouped } from './task-list-grouped';
import { AiActionBar } from './ai-action-bar';

interface RawDep {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
}

interface ProjectContentProps {
  project: Project;
  tasks: EnrichedTask[];
  allDeps: RawDep[];
  latestReview: ProjectAiReview | null;
}

export function ProjectContent({
  project,
  tasks,
  allDeps,
  latestReview,
}: ProjectContentProps) {
  const router = useRouter();
  // Controls which task row is auto-expanded (used by NextActionCard's "Open task" button)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  function handleMutation() {
    router.refresh();
  }

  // nextActionTask is the recommended_next task, if any
  const nextActionTask: Task | null = tasks.find((t) => t.recommendedNext) ?? null;

  const blockedTaskCount = tasks.filter((t) => t.computedStatus === 'blocked').length;
  const readyTaskCount = tasks.filter((t) => t.computedStatus === 'ready').length;

  // Minimal stubs passed to AiActionBar for title lookups in ReviewResultsPanel
  const taskStubs = tasks.map((t) => ({ id: t.id, title: t.title }));

  return (
    <div className="space-y-4">
      {/* Next Action card */}
      <NextActionCard
        task={nextActionTask}
        onMarkInProgress={handleMutation}
        onOpenTask={(id) => setExpandedTaskId(id)}
      />

      {/* Plan Health card */}
      <PlanHealthCard
        review={latestReview}
        blockedTaskCount={blockedTaskCount}
        readyTaskCount={readyTaskCount}
      />

      {/* Grouped task list */}
      <TaskListGrouped
        projectId={project.id}
        tasks={tasks}
        allDeps={allDeps}
        expandedTaskId={expandedTaskId}
      />

      {/* AI action bar */}
      <AiActionBar
        projectId={project.id}
        projectName={project.name}
        initialDescription={project.description}
        tasks={taskStubs}
      />
    </div>
  );
}
