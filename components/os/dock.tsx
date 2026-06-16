'use client';

import { DOCK_ORDER, getAppMeta } from '@/lib/os/apps-meta';
import { usePrefersReducedMotion } from '@/lib/os/hooks';
import { usePrefs } from '@/lib/os/prefs';
import { useWindowStore } from '@/lib/os/store';
import type { AppId } from '@/lib/os/types';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useCallback, useState } from 'react';
import { AppIcon } from './icons';

function DockItem({
  appId,
  open,
  bouncing,
  onOpen,
  reduce,
}: {
  appId: AppId;
  open: boolean;
  bouncing: boolean;
  onOpen: (id: AppId) => void;
  reduce: boolean;
}) {
  const meta = getAppMeta(appId);
  return (
    <button
      type='button'
      onClick={() => onOpen(appId)}
      className='group relative flex flex-col items-center'
      aria-label={`Open ${meta.name}`}
    >
      <span className='pointer-events-none absolute -top-9 scale-90 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs font-semibold text-popover-foreground opacity-0 shadow-md transition group-hover:scale-100 group-hover:opacity-100'>
        {meta.name}
      </span>
      <motion.span
        whileHover={reduce ? undefined : { y: -8, scale: 1.16 }}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        className={cn('block', bouncing && 'os-dock-bounce')}
      >
        <AppIcon iconId={meta.iconId} accent={meta.accent} size={46} rounded={13} />
      </motion.span>
      <span className={cn('mt-1 h-1 w-1 rounded-full bg-foreground/70 transition', open ? 'opacity-100' : 'opacity-0')} />
    </button>
  );
}

export function Dock() {
  const openApp = useWindowStore((s) => s.openApp);
  const windows = useWindowStore((s) => s.windows);
  const reduceSystem = usePrefersReducedMotion();
  const reducePref = usePrefs((s) => s.reduceMotion);
  const reduce = reduceSystem || reducePref;
  const [bouncing, setBouncing] = useState<Set<string>>(new Set());

  const openSet = new Set(windows.map((w) => w.appId));

  const handleOpen = useCallback(
    (id: AppId) => {
      openApp(id);
      if (reduce) return;
      setBouncing((prev) => new Set(prev).add(id));
      setTimeout(
        () =>
          setBouncing((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          }),
        720,
      );
    },
    [openApp, reduce],
  );

  return (
    <div className='pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2.5' style={{ zIndex: 9000 }}>
      <div className='os-panel pointer-events-auto flex items-end gap-2 rounded-[20px] border px-3 py-2.5 shadow-xl sm:gap-2.5'>
        {DOCK_ORDER.map((id) => (
          <DockItem key={id} appId={id} open={openSet.has(id)} bouncing={bouncing.has(id)} onOpen={handleOpen} reduce={reduce} />
        ))}
        <span className='mx-0.5 h-11 w-px self-center bg-border' />
        <DockItem
          appId='trash'
          open={openSet.has('trash')}
          bouncing={bouncing.has('trash')}
          onOpen={handleOpen}
          reduce={reduce}
        />
      </div>
    </div>
  );
}
