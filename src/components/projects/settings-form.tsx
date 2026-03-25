'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Project } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface SettingsFormProps {
  project: Project;
}

export function SettingsForm({ project }: SettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [status, setStatus] = useState(project.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          status,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to save changes');
        return;
      }

      setSuccess('Changes saved.');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Delete project "${project.name}"? All tasks will be permanently removed.`,
      )
    )
      return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      router.push('/dashboard');
    } catch {
      setError('Failed to delete project');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Project description"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </form>
      </Card>

      <Card className="border-red-200 p-6">
        <h3 className="mb-2 text-sm font-semibold text-red-700">
          Danger Zone
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Deleting a project permanently removes all its tasks. This cannot be
          undone.
        </p>
        <Button
          variant="destructive"
          onClick={handleDelete}
          loading={deleting}
          type="button"
        >
          Delete Project
        </Button>
      </Card>
    </div>
  );
}
