import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}
