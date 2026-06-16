'use client';

import { MENUBAR_H, WINDOW_MARGIN } from '@/lib/os/constants';
import { useWindowStore } from '@/lib/os/store';
import type { AppMeta, OSWindow, Rect } from '@/lib/os/types';
import { cn } from '@/lib/utils';
import { Expand, Minimize2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useRef } from 'react';
import { AppIcon } from './icons';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const CURSORS: Record<ResizeDir, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

function TrafficLights({ onClose, onMinimize, onMaximize }: { onClose: () => void; onMinimize: () => void; onMaximize: () => void }) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className='group/lights flex items-center gap-2' onPointerDown={stop} onDoubleClick={stop}>
      <button
        type='button'
        aria-label='Close window'
        onClick={onClose}
        className='grid h-3.5 w-3.5 place-items-center rounded-full bg-[#ff5f57] text-[8px] font-bold text-black/55 ring-1 ring-black/10 transition hover:brightness-105'
      >
        <span className='opacity-0 transition group-hover/lights:opacity-100'>×</span>
      </button>
      <button
        type='button'
        aria-label='Minimize window'
        onClick={onMinimize}
        className='grid h-3.5 w-3.5 place-items-center rounded-full bg-[#febc2e] text-[9px] font-bold text-black/55 ring-1 ring-black/10 transition hover:brightness-105'
      >
        <span className='-mt-px opacity-0 transition group-hover/lights:opacity-100'>−</span>
      </button>
      <button
        type='button'
        aria-label='Maximize window'
        onClick={onMaximize}
        className='grid h-3.5 w-3.5 place-items-center rounded-full bg-[#28c840] text-[8px] font-bold text-black/55 ring-1 ring-black/10 transition hover:brightness-105'
      >
        <span className='opacity-0 transition group-hover/lights:opacity-100'>+</span>
      </button>
    </div>
  );
}

export function Window({
  win,
  meta,
  focused,
  mobile,
  reduceMotion,
  fullscreen,
  children,
}: {
  win: OSWindow;
  meta: AppMeta;
  focused: boolean;
  mobile: boolean;
  reduceMotion: boolean;
  fullscreen: boolean;
  children: React.ReactNode;
}) {
  const { focusWindow, closeWindow, minimizeWindow, toggleMaximize, moveWindow, resizeWindow, enterFullscreen, exitFullscreen } =
    useWindowStore.getState();
  const dragState = useRef<{ px: number; py: number; rect: Rect } | null>(null);

  const beginDrag = useCallback(
    (e: React.PointerEvent) => {
      if (mobile || fullscreen || win.maximized || e.button !== 0) return;
      const start = { px: e.clientX, py: e.clientY, rect: { ...win.rect } };
      dragState.current = start;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';

      const onMove = (ev: PointerEvent) => {
        const s = dragState.current;
        if (!s) return;
        const dx = ev.clientX - s.px;
        const dy = ev.clientY - s.py;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const x = Math.max(80 - s.rect.w, Math.min(s.rect.x + dx, vw - 80));
        const y = Math.max(MENUBAR_H, Math.min(s.rect.y + dy, vh - 36));
        moveWindow(win.id, x, y);
      };
      const onUp = () => {
        dragState.current = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [mobile, fullscreen, win.maximized, win.rect, win.id, moveWindow],
  );

  const beginResize = useCallback(
    (dir: ResizeDir) => (e: React.PointerEvent) => {
      if (mobile || fullscreen || win.maximized || e.button !== 0) return;
      e.stopPropagation();
      const startRect = { ...win.rect };
      const px = e.clientX;
      const py = e.clientY;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = CURSORS[dir];

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - px;
        const dy = ev.clientY - py;
        let { x, y, w, h } = startRect;
        const minW = meta.minSize.w;
        const minH = meta.minSize.h;
        if (dir.includes('e')) w = Math.max(minW, startRect.w + dx);
        if (dir.includes('s')) h = Math.max(minH, startRect.h + dy);
        if (dir.includes('w')) {
          w = Math.max(minW, startRect.w - dx);
          x = startRect.x + (startRect.w - w);
        }
        if (dir.includes('n')) {
          h = Math.max(minH, startRect.h - dy);
          y = Math.max(MENUBAR_H, startRect.y + (startRect.h - h));
          h = startRect.y + startRect.h - y;
        }
        const vw = window.innerWidth;
        w = Math.min(w, vw - x - WINDOW_MARGIN);
        resizeWindow(win.id, { x, y, w, h });
      };
      const onUp = () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [mobile, fullscreen, win.maximized, win.rect, win.id, meta.minSize, resizeWindow],
  );

  const rect = win.rect;
  const handle = (dir: ResizeDir, className: string) => (
    <div key={dir} onPointerDown={beginResize(dir)} className={cn('absolute z-20', className)} style={{ cursor: CURSORS[dir], touchAction: 'none' }} />
  );

  return (
    <motion.div
      role='dialog'
      aria-label={win.title}
      onPointerDownCapture={() => !fullscreen && focusWindow(win.id)}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
      transition={reduceMotion ? { duration: 0.12 } : { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
      className={cn(
        'pointer-events-auto absolute flex flex-col overflow-hidden bg-card text-card-foreground',
        fullscreen ? 'rounded-none' : cn('rounded-[var(--win-radius)]', focused ? 'os-window-shadow-focused' : 'os-window-shadow'),
      )}
      style={
        fullscreen
          ? { left: 0, top: 0, width: '100%', height: '100%', zIndex: 99990 }
          : { left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: win.z }
      }
    >
      {/* Title bar (hidden in fullscreen) */}
      {!fullscreen && (
        <div
          onPointerDown={beginDrag}
          onDoubleClick={() => !mobile && toggleMaximize(win.id)}
          className={cn(
            'relative flex h-[var(--titlebar-h)] shrink-0 items-center gap-2 border-b px-3 select-none',
            focused ? 'bg-secondary/80' : 'bg-secondary/40',
            !mobile && !win.maximized && 'cursor-grab active:cursor-grabbing',
          )}
          style={{ touchAction: 'none' }}
        >
          <TrafficLights
            onClose={() => closeWindow(win.id)}
            onMinimize={() => minimizeWindow(win.id)}
            onMaximize={() => toggleMaximize(win.id)}
          />
          <div className='pointer-events-none absolute inset-x-0 flex items-center justify-center gap-1.5'>
            <AppIcon iconId={meta.iconId} accent={meta.accent} size={16} rounded={5} />
            <span className={cn('max-w-[55%] truncate text-[13px] font-semibold', focused ? 'opacity-90' : 'opacity-55')}>{win.title}</span>
          </div>
          <button
            type='button'
            aria-label='Enter fullscreen'
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => enterFullscreen(win.id)}
            className='z-10 ml-auto grid h-6 w-6 place-items-center rounded-md text-foreground/45 transition hover:bg-foreground/10 hover:text-foreground/80'
          >
            <Expand size={13} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className='relative min-h-0 flex-1 overflow-hidden'>{children}</div>

      {/* Fullscreen exit affordance */}
      {fullscreen && (
        <button
          type='button'
          onClick={() => exitFullscreen()}
          aria-label='Exit fullscreen'
          className='absolute right-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1.5 text-xs font-semibold text-foreground/70 shadow-md backdrop-blur transition hover:text-foreground'
        >
          <Minimize2 size={14} /> Exit fullscreen
          <kbd className='rounded bg-muted px-1 py-0.5 text-[10px] font-bold'>Esc</kbd>
        </button>
      )}

      {/* Resize handles */}
      {!fullscreen && !mobile && !win.maximized && (
        <>
          {handle('n', 'inset-x-2 top-0 h-1.5')}
          {handle('s', 'inset-x-2 bottom-0 h-1.5')}
          {handle('e', 'inset-y-2 right-0 w-1.5')}
          {handle('w', 'inset-y-2 left-0 w-1.5')}
          {handle('nw', 'left-0 top-0 h-3 w-3')}
          {handle('ne', 'right-0 top-0 h-3 w-3')}
          {handle('sw', 'left-0 bottom-0 h-3 w-3')}
          {handle('se', 'right-0 bottom-0 h-3 w-3')}
        </>
      )}
    </motion.div>
  );
}
