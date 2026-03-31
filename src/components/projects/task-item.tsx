'use client';

import { useEffect, useRef, useState } from 'react';
import { type Task } from '@/db/schema';
import { Badge, type TaskEffort, type TaskPriority, type TaskStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const statusCycle: TaskStatus[] = ['backlog', 'in_progress', 'done'];
const priorityCycle: TaskPriority[] = ['low', 'medium', 'high'];

export interface TaskDep {
  id: string; // dependency row ID — used for DELETE /api/projects/[id]/dependencies/[depId]
  dependsOnTitle: string;
}

interface TaskItemProps {
  task: Task;
  // Optional — not all callers supply dependency data
  deps?: TaskDep[];
  projectId?: string; // required when deps are provided (for dep removal endpoint)
  defaultExpanded?: boolean;
  onMutated: () => void;
}

export function TaskItem({
  task,
  deps,
  projectId,
  defaultExpanded = false,
  onMutated,
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [description, setDescription] = useState(task.description ?? '');
  const [blockedReason, setBlockedReason] = useState(task.blockedReason ?? '');
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingPriority, setLoadingPriority] = useState(false);
  const [loadingDesc, setLoadingDesc] = useState(false);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingDepId, setRemovingDepId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const rowRef = useRef<HTMLDivElement>(null);

  // Sync description and blockedReason when server data refreshes
  useEffect(() => {
    setDescription(task.description ?? '');
  }, [task.description]);

  useEffect(() => {
    setBlockedReason(task.blockedReason ?? '');
  }, [task.blockedReason]);

  // Expand and scroll when defaultExpanded is toggled externally (e.g. "Open task" in NextActionCard)
  useEffect(() => {
    if (defaultExpanded) {
      setExpanded(true);
      rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [defaultExpanded]);

  async function cycleStatus() {
    const idx = statusCycle.indexOf(task.status as TaskStatus);
    const next = statusCycle[(idx + 1) % statusCycle.length];
    setLoadingStatus(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      onMutated();
    } catch {
      setError('Failed to update status');
    } finally {
      setLoadingStatus(false);
    }
  }

  async function cyclePriority() {
    const idx = priorityCycle.indexOf(task.priority as TaskPriority);
    const next = priorityCycle[(idx + 1) % priorityCycle.length];
    setLoadingPriority(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: next }),
      });
      if (!res.ok) throw new Error();
      onMutated();
    } catch {
      setError('Failed to update priority');
    } finally {
      setLoadingPriority(false);
    }
  }

  async function saveDescription() {
    setLoadingDesc(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error();
      onMutated();
    } catch {
      setError('Failed to save description');
    } finally {
      setLoadingDesc(false);
    }
  }

  async function saveBlockedReason() {
    setLoadingBlocked(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedReason: blockedReason || null }),
      });
      if (!res.ok) throw new Error();
      onMutated();
    } catch {
      setError('Failed to save blocked reason');
    } finally {
      setLoadingBlocked(false);
    }
  }

  async function handleRemoveDep(depId: string) {
    if (!projectId) return;
    setRemovingDepId(depId);
    setError('');
    try {
      const res = await fetch(
        `/api/projects/${projectId}/dependencies/${depId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error();
      onMutated();
    } catch {
      setError('Failed to remove dependency');
    } finally {
      setRemovingDepId(null);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onMutated();
    } catch {
      setError('Failed to delete task');
      setDeleting(false);
    }
  }

  const depCount = deps?.length ?? 0;

  return (
    <div
      ref={rowRef}
      id={`task-${task.id}`}
      className="rounded-lg border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Status toggle */}
        <button
          onClick={cycleStatus}
          disabled={loadingStatus}
          className="mt-0.5 shrink-0 disabled:opacity-50"
          title="Click to cycle status"
          type="button"
        >
          {/* task.status is constrained by Zod validation on write */}
          <Badge variant={task.status as TaskStatus} />
        </button>

        {/* Title + inline signals */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="min-w-0 flex-1 text-left"
          type="button"
        >
          <span className="text-sm font-medium text-zinc-200 transition-colors hover:text-zinc-100">
            {task.aiGenerated && (
              <span className="mr-1 text-indigo-400" title="AI-generated">✦</span>
            )}
            {task.recommendedNext && (
              <span className="mr-1 text-amber-400" title="Recommended next">▶</span>
            )}
            {task.title}
          </span>
          {/* Blocked reason inline */}
          {task.blockedReason && (
            <p className="mt-0.5 text-xs text-amber-500">
              Blocked: {task.blockedReason}
            </p>
          )}
          {/* AI rationale inline — muted */}
          {task.aiRationale && (
            <p className="mt-0.5 text-xs text-zinc-600">{task.aiRationale}</p>
          )}
        </button>

        {/* Right-side badges */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {/* Effort badge — values constrained by Zod on write */}
          <Badge variant={task.effort as TaskEffort} />
          {/* Priority badge — clickable to cycle */}
          <button
            onClick={cyclePriority}
            disabled={loadingPriority}
            className="disabled:opacity-50"
            title="Click to cycle priority"
            type="button"
          >
            <Badge variant={task.priority as TaskPriority} />
          </button>
          {/* Dependency count */}
          {depCount > 0 && (
            <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-500">
              {depCount} {depCount === 1 ? 'dep' : 'deps'}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-zinc-800 px-4 pb-4 pt-3">
          {/* Description */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Description
            </p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={saveDescription}
              loading={loadingDesc}
              className="mt-1.5"
              type="button"
            >
              Save description
            </Button>
          </div>

          {/* Blocked reason */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Blocked reason
            </p>
            <Textarea
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              placeholder="Why is this blocked? (leave empty to unblock)"
              rows={2}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={saveBlockedReason}
              loading={loadingBlocked}
              className="mt-1.5"
              type="button"
            >
              Save
            </Button>
          </div>

          {/* Dependency list */}
          {deps && deps.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Dependencies
              </p>
              <ul className="space-y-1">
                {deps.map((dep) => (
                  <li
                    key={dep.id}
                    className="flex items-center justify-between rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400"
                  >
                    <span>{dep.dependsOnTitle}</span>
                    <button
                      onClick={() => handleRemoveDep(dep.id)}
                      disabled={removingDepId === dep.id}
                      className="ml-2 text-zinc-600 transition-colors hover:text-red-400 disabled:opacity-50"
                      type="button"
                      aria-label={`Remove dependency on ${dep.dependsOnTitle}`}
                    >
                      {removingDepId === dep.id ? '…' : '✕'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
              type="button"
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
