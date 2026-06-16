'use client';

import { DESKTOP_ORDER, getAppMeta } from '@/lib/os/apps-meta';
import { MENUBAR_H } from '@/lib/os/constants';
import { useWindowStore } from '@/lib/os/store';
import type { AppId } from '@/lib/os/types';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { AppIcon } from './icons';

export function DesktopIcons() {
  const openApp = useWindowStore((s) => s.openApp);
  const [selected, setSelected] = useState<AppId | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setSelected(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  return (
    <div
      ref={ref}
      className='absolute left-2 flex flex-col gap-1'
      style={{ top: MENUBAR_H + 8, zIndex: 1 }}
    >
      {DESKTOP_ORDER.map((id) => {
        const meta = getAppMeta(id);
        const isSel = selected === id;
        return (
          <button
            key={id}
            type='button'
            onClick={() => setSelected(id)}
            onDoubleClick={() => openApp(id)}
            onKeyDown={(e) => e.key === 'Enter' && openApp(id)}
            className={cn(
              'group flex w-[84px] flex-col items-center gap-1 rounded-lg p-2 text-center transition',
              isSel ? 'bg-[var(--brand-blue)]/25 ring-1 ring-[var(--brand-blue)]/40' : 'hover:bg-white/10',
            )}
          >
            <AppIcon iconId={meta.iconId} accent={meta.accent} size={44} rounded={12} />
            <span
              className={cn(
                'line-clamp-2 max-w-full break-words rounded px-1.5 py-0.5 text-center text-[12px] font-semibold leading-tight',
                isSel ? 'bg-[var(--brand-blue)] text-white' : 'bg-black/35 text-white',
              )}
              style={{ textShadow: isSel ? 'none' : '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {meta.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
