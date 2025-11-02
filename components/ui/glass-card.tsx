'use client';
import React from 'react';
import { cn } from '@/lib/utils';

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  as?: React.ElementType;
};

export function GlassCard({ className, as: As = 'div', ...props }: GlassCardProps) {
  return (
    <As
      className={cn(
        'relative rounded-3xl overflow-hidden',
        'bg-gradient-to-br from-white/75 via-white/70 to-white/65',
        'dark:from-slate-900/70 dark:via-slate-900/65 dark:to-slate-900/60',
        'backdrop-blur-xl backdrop-saturate-200',
        'border border-white/40 dark:border-white/15',
        'shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]',
        'dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]',
        'before:absolute before:inset-0 before:rounded-3xl',
        'before:bg-gradient-to-br before:from-white/25 before:via-transparent before:to-transparent',
        'before:pointer-events-none before:z-0',
        'after:absolute after:inset-[1px] after:rounded-[calc(1.5rem-1px)]',
        'after:bg-gradient-to-t after:from-black/5 after:via-transparent after:to-transparent',
        'after:pointer-events-none after:z-0',
        className,
      )}
      {...props}
    />
  );
}

