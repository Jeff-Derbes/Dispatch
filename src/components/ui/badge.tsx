import { cn } from '@/lib/cn';

export type ProjectStatus = 'active' | 'on_hold' | 'completed';
export type TaskStatus = 'backlog' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
// 'medium' is shared with TaskPriority — same colour for both
export type TaskEffort = 'small' | 'medium' | 'large';
export type BadgeVariant = ProjectStatus | TaskStatus | TaskPriority | TaskEffort;

const variantClasses: Record<BadgeVariant, string> = {
  // Project status
  active: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/25',
  on_hold: 'bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/25',
  completed: 'bg-zinc-700/50 text-zinc-400',
  // Task status
  backlog: 'bg-zinc-800 text-zinc-500',
  in_progress: 'bg-indigo-500/15 text-indigo-400 ring-1 ring-inset ring-indigo-500/25',
  done: 'bg-emerald-500/12 text-emerald-500',
  // Task priority / impact (shared scale)
  low: 'bg-zinc-800 text-zinc-500',
  medium: 'bg-orange-500/15 text-orange-400',
  high: 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/25',
  // Task effort (small/large; medium reuses priority)
  small: 'bg-sky-500/15 text-sky-400',
  large: 'bg-violet-500/15 text-violet-400',
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
  small: 'Small',
  large: 'Large',
};

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
}

export function Badge({ variant, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {variantLabels[variant]}
    </span>
  );
}
