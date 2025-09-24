'use client';
import React from 'react';
import { cn } from '@/lib/utils';

type FloatingBackdropProps = React.PropsWithChildren<{
  className?: string;
  blobs?: boolean;
}>;

export function FloatingBackdrop({ children, className, blobs = true }: FloatingBackdropProps) {
  return (
    <div className={cn('relative', className)}>
      {blobs && (
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-30">
          <div className="absolute top-6 right-6 w-28 h-28 sm:w-40 sm:h-40 bg-gradient-to-br from-cyan-200 to-blue-300 dark:from-cyan-800 dark:to-blue-900 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-8 w-24 h-24 sm:w-36 sm:h-36 bg-gradient-to-br from-teal-200 to-cyan-300 dark:from-teal-800 dark:to-cyan-900 rounded-full blur-2xl" />
          <div className="absolute top-1/3 left-1/3 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-200 to-violet-300 dark:from-blue-900 dark:to-violet-900 rounded-full blur-2xl" />
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

