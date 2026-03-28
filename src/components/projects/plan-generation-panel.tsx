'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, type TaskEffort, type TaskPriority } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface PlanTask {
  clientId: string;
  editedTitle: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'small' | 'medium' | 'large';
  impact: 'low' | 'medium' | 'high';
  phase: string | null;
  dependsOnClientIds: string[];
  selected: boolean;
}

interface PlanGenerationPanelProps {
  projectId: string;
  projectName: string;
  initialDescription?: string | null;
  onClose: () => void;
  onTasksAdded: () => void;
}

export function PlanGenerationPanel({
  projectId,
  projectName,
  initialDescription,
  onClose,
  onTasksAdded,
}: PlanGenerationPanelProps) {
  const [goalDescription, setGoalDescription] = useState(initialDescription ?? '');
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleGenerate() {
    if (!goalDescription.trim()) return;
    setGenerating(true);
    setError('');
    setTasks([]);
    setHasGenerated(false);

    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectName,
          description: goalDescription,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? 'Generation failed');
        return;
      }

      const data = await res.json() as {
        data: {
          summary: string;
          tasks: Array<{
            clientId: string;
            title: string;
            description?: string;
            priority: 'low' | 'medium' | 'high';
            effort: 'small' | 'medium' | 'large';
            impact: 'low' | 'medium' | 'high';
            phase: string | null;
            dependsOnClientIds: string[];
          }>;
        };
      };

      setTasks(
        data.data.tasks.map((t) => ({
          ...t,
          editedTitle: t.title,
          selected: true,
        }))
      );
    } catch {
      setError('Failed to reach the AI service');
    } finally {
      setGenerating(false);
      setHasGenerated(true);
    }
  }

  function toggleTask(clientId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.clientId === clientId ? { ...t, selected: !t.selected } : t))
    );
  }

  function updateTitle(clientId: string, title: string) {
    setTasks((prev) =>
      prev.map((t) => (t.clientId === clientId ? { ...t, editedTitle: title } : t))
    );
  }

  async function handleApply() {
    const selectedTasks = tasks.filter((t) => t.selected);
    if (selectedTasks.length === 0) return;

    setApplying(true);
    setError('');

    // clientId → server-assigned UUID, built up as tasks are created
    const clientToServerId = new Map<string, string>();

    try {
      // Step 1: create all selected tasks sequentially (order matters for dep creation)
      for (const task of selectedTasks) {
        const res = await fetch(`/api/projects/${projectId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.editedTitle,
            description: task.description,
            priority: task.priority,
            effort: task.effort,
            impact: task.impact,
            phase: task.phase,
            aiGenerated: true,
          }),
        });
        if (!res.ok) throw new Error(`Failed to create task "${task.editedTitle}"`);
        const created = await res.json() as { data: { id: string } };
        clientToServerId.set(task.clientId, created.data.id);
      }

      // Step 2: create dependencies sequentially (all tasks must exist first)
      const selectedClientIds = new Set(selectedTasks.map((t) => t.clientId));
      for (const task of selectedTasks) {
        const taskServerId = clientToServerId.get(task.clientId);
        if (!taskServerId) continue;

        for (const depClientId of task.dependsOnClientIds) {
          // Only create dep if the dependency task was also selected
          if (!selectedClientIds.has(depClientId)) continue;
          const depServerId = clientToServerId.get(depClientId);
          if (!depServerId) continue;

          const res = await fetch(`/api/projects/${projectId}/dependencies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: taskServerId,
              dependsOnTaskId: depServerId,
            }),
          });
          // Ignore 409 (duplicate or cycle) — not fatal
          if (!res.ok && res.status !== 409) {
            throw new Error('Failed to create dependency');
          }
        }
      }

      onTasksAdded(); // triggers router.refresh() via handleMutation in AiActionBar
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply plan');
    } finally {
      setApplying(false);
    }
  }

  // Compute which selected tasks will have dependencies dropped because the
  // dependency task was deselected
  const selectedClientIds = new Set(tasks.filter((t) => t.selected).map((t) => t.clientId));
  const clientTitleMap = new Map(tasks.map((t) => [t.clientId, t.editedTitle]));

  function droppedDeps(task: PlanTask): string[] {
    if (!task.selected) return [];
    return task.dependsOnClientIds
      .filter((depId) => !selectedClientIds.has(depId))
      .map((depId) => clientTitleMap.get(depId) ?? depId);
  }

  const selectedCount = tasks.filter((t) => t.selected).length;

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-indigo-900">✦ Generate plan</h3>
        <button
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-600"
          type="button"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      <Textarea
        value={goalDescription}
        onChange={(e) => setGoalDescription(e.target.value)}
        placeholder="Describe the goal for this project..."
        rows={3}
        className="mb-3"
      />

      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          loading={generating}
          disabled={!goalDescription.trim() || generating}
          size="sm"
          type="button"
        >
          Generate
        </Button>
        {tasks.length === 0 && !generating && (
          <Button onClick={onClose} variant="ghost" size="sm" type="button">
            Cancel
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {hasGenerated && !generating && tasks.length === 0 && !error && (
        <p className="mt-3 text-sm text-gray-500">
          No tasks were generated. Try describing the goal in more detail.
        </p>
      )}

      {tasks.length > 0 && (
        <div className="mt-4">
          <div className="space-y-2">
            {tasks.map((task) => {
              const dropped = droppedDeps(task);
              return (
                <div
                  key={task.clientId}
                  className="rounded-md border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.selected}
                      onChange={() => toggleTask(task.clientId)}
                      className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
                    />
                    <div className="min-w-0 flex-1">
                      {/* Inline-editable title */}
                      <Input
                        value={task.editedTitle}
                        onChange={(e) => updateTitle(task.clientId, e.target.value)}
                        className="mb-2 text-sm font-medium"
                      />
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-xs text-indigo-400">✦</span>
                        {/* effort is constrained by Zod validation on the AI response */}
                        <Badge variant={task.effort as TaskEffort} />
                        {/* impact shares the priority scale */}
                        <Badge variant={task.impact as TaskPriority} />
                        <Badge variant={task.priority as TaskPriority} />
                        {task.phase && (
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                            {task.phase}
                          </span>
                        )}
                        {task.dependsOnClientIds.length > 0 && (
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">
                            {task.dependsOnClientIds.length}{' '}
                            {task.dependsOnClientIds.length === 1 ? 'dep' : 'deps'}
                          </span>
                        )}
                      </div>
                      {/* Deselect warning — show but do not block */}
                      {dropped.length > 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          {dropped.map((title) => (
                            <span key={title}>
                              Dependency on &ldquo;{title}&rdquo; will be dropped.{' '}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              onClick={handleApply}
              loading={applying}
              disabled={selectedCount === 0 || applying}
              size="sm"
              type="button"
            >
              Apply selected ({selectedCount})
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm" type="button">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
