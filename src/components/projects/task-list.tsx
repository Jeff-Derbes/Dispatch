'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Task } from '@/db/schema';
import { Badge, type TaskPriority, type TaskStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaskItem } from './task-item';
import { AddTaskForm } from './add-task-form';
import { BreakdownPanel } from './breakdown-panel';

interface SuggestedPriority {
  id: string;
  suggestedPriority: 'low' | 'medium' | 'high';
  rationale: string;
}

interface TaskListProps {
  projectId: string;
  projectName: string;
  projectDescription?: string | null;
  tasks: Task[];
}

export function TaskList({
  projectId,
  projectName,
  projectDescription,
  tasks,
}: TaskListProps) {
  const router = useRouter();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedPriority[] | null>(
    null
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [applyingSuggestions, setApplyingSuggestions] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  // Only non-done tasks can be prioritized
  const openTasks = tasks.filter((t) => t.status !== 'done');
  const canSuggest = openTasks.length > 0;

  function handleMutation() {
    router.refresh();
  }

  async function handleSuggestPriorities() {
    setLoadingSuggestions(true);
    setSuggestError('');
    setSuggestions(null);

    try {
      const res = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: openTasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            // status/priority are constrained by Zod on write
            priority: t.priority as 'low' | 'medium' | 'high',
            status: t.status as 'backlog' | 'in_progress' | 'done',
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setSuggestError(data.error ?? 'Prioritization failed');
        return;
      }

      const data = await res.json() as { data: SuggestedPriority[] };
      setSuggestions(data.data);
    } catch {
      setSuggestError('Failed to reach the AI service');
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleApplySuggestions() {
    if (!suggestions) return;
    setApplyingSuggestions(true);
    setSuggestError('');

    try {
      for (const s of suggestions) {
        const res = await fetch(`/api/tasks/${s.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: s.suggestedPriority }),
        });
        if (!res.ok) throw new Error('Failed to update task');
      }
      setSuggestions(null);
      router.refresh();
    } catch {
      setSuggestError('Failed to apply suggestions');
    } finally {
      setApplyingSuggestions(false);
    }
  }

  const suggestionMap = new Map(
    suggestions?.map((s) => [s.id, s]) ?? []
  );

  return (
    <div>
      {showBreakdown && (
        <BreakdownPanel
          projectId={projectId}
          projectName={projectName}
          initialDescription={projectDescription}
          onClose={() => setShowBreakdown(false)}
          onTasksAdded={handleMutation}
        />
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Tasks ({tasks.length})
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {!showBreakdown && (
            <Button
              onClick={() => setShowBreakdown(true)}
              variant="ghost"
              size="sm"
              type="button"
            >
              ✦ Break it down
            </Button>
          )}
          <div
            title={
              !canSuggest ? 'No open tasks to prioritize' : undefined
            }
          >
            <Button
              onClick={handleSuggestPriorities}
              variant="ghost"
              size="sm"
              loading={loadingSuggestions}
              disabled={!canSuggest || loadingSuggestions}
              type="button"
            >
              Suggest priorities
            </Button>
          </div>
        </div>
      </div>

      {suggestError && (
        <p className="mb-2 text-xs text-red-600">{suggestError}</p>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-10 text-center">
          <p className="text-sm font-medium text-gray-900">No tasks yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Add a task below, or use &ldquo;Break it down&rdquo; to generate tasks with AI.
          </p>
        </div>
      ) : suggestions ? (
        // Suggestion overlay — shows current vs suggested priority with rationale
        <div>
          <div className="space-y-1">
            {tasks.map((task) => {
              const suggestion = suggestionMap.get(task.id);
              return (
                <div
                  key={task.id}
                  className="rounded-md border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-center gap-2">
                    {/* status/priority values are constrained by Zod on write */}
                    <Badge variant={task.status as TaskStatus} />
                    <span className="flex-1 truncate text-sm font-medium text-gray-900">
                      {task.aiGenerated && (
                        <span className="mr-1 text-indigo-400">✦</span>
                      )}
                      {task.title}
                    </span>
                    {suggestion ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge variant={task.priority as TaskPriority} />
                        <span className="text-xs text-gray-400">→</span>
                        <Badge variant={suggestion.suggestedPriority} />
                      </div>
                    ) : (
                      <Badge variant={task.priority as TaskPriority} />
                    )}
                  </div>
                  {suggestion?.rationale && (
                    <p className="mt-1 pl-6 text-xs text-gray-500">
                      {suggestion.rationale}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              onClick={handleApplySuggestions}
              loading={applyingSuggestions}
              disabled={applyingSuggestions}
              size="sm"
              type="button"
            >
              Apply suggestions
            </Button>
            <Button
              onClick={() => {
                setSuggestions(null);
                setSuggestError('');
              }}
              variant="ghost"
              size="sm"
              type="button"
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onMutated={handleMutation} />
          ))}
        </div>
      )}

      <div className="mt-4">
        <AddTaskForm projectId={projectId} onAdded={handleMutation} />
      </div>
    </div>
  );
}
