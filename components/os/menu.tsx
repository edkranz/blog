'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useEffect, useRef } from 'react';

/** One row of a dropdown menu, or a separator. */
export type MenuEntry = 'sep' | { label: string; onSelect?: () => void; disabled?: boolean; checked?: boolean; hint?: string };

export function MenuList({ entries, onClose, className }: { entries: MenuEntry[]; onClose: () => void; className?: string }) {
  return (
    <div role='menu' className={cn('w-56 rounded-xl border bg-card p-1.5 shadow-xl', className)}>
      {entries.map((e, i) =>
        e === 'sep' ? (
          <div key={`sep-${i}`} className='my-1 h-px bg-border' />
        ) : (
          <button
            key={e.label}
            type='button'
            role='menuitem'
            disabled={e.disabled}
            onPointerDown={(ev) => ev.preventDefault()}
            onClick={() => {
              e.onSelect?.();
              onClose();
            }}
            className='flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-foreground transition enabled:hover:bg-primary enabled:hover:text-primary-foreground disabled:opacity-40'
          >
            <span className='grid w-3.5 shrink-0 place-items-center'>{e.checked ? <Check size={12} strokeWidth={3} /> : null}</span>
            <span className='min-w-0 flex-1 truncate'>{e.label}</span>
            {e.hint ? <span className='shrink-0 text-[11px] opacity-60'>{e.hint}</span> : null}
          </button>
        )
      )}
    </div>
  );
}

/**
 * A menu-bar style dropdown: click the title to open; while any sibling in the same group is
 * open, hovering another title switches to it (pass the shared `openId`/`setOpenId`).
 */
export function Dropdown({
  id,
  title,
  entries,
  openId,
  setOpenId,
  align = 'left',
  className,
  titleClassName,
}: {
  id: string;
  title: React.ReactNode;
  entries: MenuEntry[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
  align?: 'left' | 'right';
  className?: string;
  titleClassName?: string;
}) {
  const open = openId === id;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenId(null);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, setOpenId]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type='button'
        aria-haspopup='menu'
        aria-expanded={open}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => setOpenId(open ? null : id)}
        onPointerEnter={() => {
          if (openId !== null && openId !== id) setOpenId(id);
        }}
        className={cn('rounded-md px-1.5 py-0.5 transition', open ? 'bg-foreground/10' : 'hover:bg-foreground/[0.07]', titleClassName)}
      >
        {title}
      </button>
      {open ? (
        <div className={cn('absolute top-[calc(100%+4px)] z-50', align === 'right' ? 'right-0' : 'left-0')}>
          <MenuList entries={entries} onClose={() => setOpenId(null)} />
        </div>
      ) : null}
    </div>
  );
}
