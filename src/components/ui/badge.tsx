import { cn } from '@/lib/cn';

export type ProjectStatus = 'active' | 'on_hold' | 'completed';
export type TaskStatus = 'backlog' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type BadgeVariant = ProjectStatus | TaskStatus | TaskPriority;

const variantClasses: Record<BadgeVariant, string> = {
  // Project status
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-600',
  // Task status
  backlog: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
  // Task priority
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-orange-100 text-orange-600',
  high: 'bg-red-100 text-red-600',
};

const variantLabels: Record<BadgeVariant, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  backlog: 'Backlog',
  in_progress: 'In Progress',
  done: 'Done',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
}

export function Badge({ variant, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {variantLabels[variant]}
    </span>
  );
}
