'use client';

import { getAppMeta } from '@/lib/os/apps-meta';
import { MENUBAR_H } from '@/lib/os/constants';
import { useMounted } from '@/lib/os/hooks';
import { useWindowStore } from '@/lib/os/store';
import { cn } from '@/lib/utils';
import { BatteryMedium, Moon, Sun, Volume2, Wifi } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { AppIcon } from './icons';

function Clock() {
  const mounted = useMounted();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!mounted || !now) return <span className='w-28' />;
  const day = now.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
  return (
    <span className='tabular-nums'>
      {day}&nbsp;&nbsp;{time}
    </span>
  );
}

function EddieMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openApp = useWindowStore((s) => s.openApp);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const act = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  const Item = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button
      type='button'
      onClick={onClick}
      className='w-full rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-foreground transition hover:bg-primary hover:text-primary-foreground'
    >
      {children}
    </button>
  );

  return (
    <div ref={ref} className='relative'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        className={cn('grid h-[18px] w-[18px] place-items-center rounded-md transition', open && 'bg-foreground/10')}
        aria-label='Eddie menu'
      >
        <AppIcon iconId='face' size={18} rounded={5} />
      </button>
      {open ? (
        <div className='absolute left-0 top-[26px] w-56 rounded-xl border p-1.5 os-panel shadow-xl'>
          <Item onClick={act(() => openApp('welcome'))}>About Eddie OS</Item>
          <Item onClick={act(() => openApp('settings'))}>System Settings…</Item>
          <div className='my-1 h-px bg-border' />
          <Item onClick={act(() => openApp('terminal'))}>Open Terminal</Item>
          <Item onClick={act(() => openApp('about'))}>About Me</Item>
          <div className='my-1 h-px bg-border' />
          <Item onClick={act(() => window.open('https://github.com/edkranz/blog', '_blank', 'noopener'))}>
            View source ↗
          </Item>
          <Item onClick={act(() => window.location.reload())}>Restart…</Item>
        </div>
      ) : null}
    </div>
  );
}

function ThemeToggle() {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();
  if (!mounted) return <span className='h-[18px] w-[18px]' />;
  const dark = resolvedTheme === 'dark';
  return (
    <button
      type='button'
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label='Toggle theme'
      className='grid h-[18px] w-[18px] place-items-center rounded-md text-foreground/80 transition hover:bg-foreground/10'
    >
      {dark ? <Moon size={14} /> : <Sun size={14} />}
    </button>
  );
}

export function MenuBar() {
  const focusedId = useWindowStore((s) => s.focusedId);
  const windows = useWindowStore((s) => s.windows);
  const active = windows.find((w) => w.id === focusedId);
  const appName = active ? getAppMeta(active.appId).name : 'Finder';

  return (
    <header
      className='os-panel absolute inset-x-0 top-0 flex select-none items-center justify-between border-b px-2.5 text-[13px] text-foreground/85'
      style={{ height: MENUBAR_H, zIndex: 9500 }}
    >
      <div className='flex items-center gap-3'>
        <EddieMenu />
        <span className='font-bold'>{appName}</span>
        <nav className='hidden items-center gap-3 font-medium text-foreground/65 sm:flex'>
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Window</span>
        </nav>
      </div>
      <div className='flex items-center gap-2.5'>
        <Wifi size={14} className='hidden text-foreground/70 sm:block' />
        <Volume2 size={14} className='hidden text-foreground/70 sm:block' />
        <BatteryMedium size={16} className='hidden text-foreground/70 sm:block' />
        <ThemeToggle />
        <span className='pl-1 font-medium'>
          <Clock />
        </span>
      </div>
    </header>
  );
}
