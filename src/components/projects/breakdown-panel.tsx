'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge, type TaskPriority } from '@/components/ui/badge';

interface AiTask {
  localId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  selected: boolean;
}

interface BreakdownPanelProps {
  projectId: string;
  projectName: string;
  initialDescription?: string | null;
  onClose: () => void;
  onTasksAdded: () => void;
}

export function BreakdownPanel({
  projectId,
  projectName,
  initialDescription,
  onClose,
  onTasksAdded,
}: BreakdownPanelProps) {
  const [goalDescription, setGoalDescription] = useState(
    initialDescription ?? ''
  );
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [adding, setAdding] = useState(false);
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!goalDescription.trim()) return;
    setGenerating(true);
    setError('');
    setTasks([]);
    setHasGenerated(false);

    try {
      const response = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, description: goalDescription }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? 'Generation failed');
        return;
      }

      if (!response.body) {
        setError('No response body');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const raw = JSON.parse(line) as {
              title: string;
              description: string;
              priority: string;
            };
            setTasks((prev) => [
              ...prev,
              {
                localId: crypto.randomUUID(),
                title: raw.title,
                description: raw.description,
                // priority is validated server-side; cast is safe
                priority: (raw.priority as 'low' | 'medium' | 'high') ?? 'medium',
                selected: true,
              },
            ]);
          } catch {
            // skip unparseable lines (e.g. partial chunks)
          }
        }
      }
    } catch {
      setError('Failed to reach the AI service');
    } finally {
      setGenerating(false);
      setHasGenerated(true);
    }
  }

  function toggleTask(localId: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.localId === localId ? { ...t, selected: !t.selected } : t
      )
    );
  }

  async function handleAddSelected() {
    const selected = tasks.filter((t) => t.selected);
    if (selected.length === 0) return;

    setAdding(true);
    setError('');

    try {
      for (const task of selected) {
        const res = await fetch(`/api/projects/${projectId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            priority: task.priority,
            aiGenerated: true,
          }),
        });
        if (!res.ok) throw new Error('Failed to create task');
      }
      onTasksAdded();
      onClose();
    } catch {
      setError('Failed to add tasks');
    } finally {
      setAdding(false);
    }
  }

  const selectedCount = tasks.filter((t) => t.selected).length;

  return (
    <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-indigo-900">
          ✦ Break it down
        </h3>
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
            {tasks.map((task) => (
              <label
                key={task.localId}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 bg-white p-3 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={task.selected}
                  onChange={() => toggleTask(task.localId)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-indigo-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-indigo-400">✦</span>
                    <span className="text-sm font-medium text-gray-900">
                      {task.title}
                    </span>
                    {/* priority is validated server-side via Zod before streaming */}
                    <Badge variant={task.priority as TaskPriority} />
                  </div>
                  {task.description && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {task.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              onClick={handleAddSelected}
              loading={adding}
              disabled={selectedCount === 0 || adding}
              size="sm"
              type="button"
            >
              Add selected ({selectedCount})
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
