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
        'rounded-3xl ring-1 ring-white/20 bg-white/35 dark:bg-slate-900/30 backdrop-blur-xl shadow-xl',
        className,
      )}
      {...props}
    />
  );
}

