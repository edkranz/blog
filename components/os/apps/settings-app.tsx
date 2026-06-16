'use client';

import { useMounted } from '@/lib/os/hooks';
import { WALLPAPERS, type Wallpaper, usePrefs } from '@/lib/os/prefs';
import { useWindowStore } from '@/lib/os/store';
import { cn } from '@/lib/utils';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { AppScroll, SectionLabel } from '../ui';

function ThemeSeg() {
  const { theme, setTheme } = useTheme();
  const opts = [
    { id: 'light', label: 'Day', icon: Sun },
    { id: 'dark', label: 'Night', icon: Moon },
    { id: 'system', label: 'Auto', icon: Monitor },
  ] as const;
  return (
    <div className='inline-flex rounded-xl border bg-secondary/40 p-1'>
      {opts.map((o) => {
        const active = theme === o.id;
        return (
          <button
            key={o.id}
            type='button'
            onClick={() => setTheme(o.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition',
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <o.icon size={15} /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

function WallpaperRow({ which }: { which: 'light' | 'dark' }) {
  const { wallpaperLight, wallpaperDark, setWallpaper } = usePrefs();
  const current = which === 'light' ? wallpaperLight : wallpaperDark;
  const list = WALLPAPERS.filter((w) => w.dark === (which === 'dark'));
  return (
    <div className='flex flex-wrap gap-2.5'>
      {list.map((w) => (
        <button
          key={w.id}
          type='button'
          onClick={() => setWallpaper(which, w.id as Wallpaper)}
          className={cn(
            'overflow-hidden rounded-xl border-2 text-left transition',
            current === w.id ? 'border-primary' : 'border-transparent hover:border-foreground/20',
          )}
        >
          <div className={cn('h-12 w-20', w.className)} />
          <div className='bg-card px-2 py-1 text-[11px] font-semibold'>{w.label}</div>
        </button>
      ))}
    </div>
  );
}

export function SettingsApp() {
  const mounted = useMounted();
  const { reduceMotion, setReduceMotion } = usePrefs();

  return (
    <AppScroll className='bg-card'>
      <div className='mx-auto max-w-xl px-6 py-7'>
        <h1 className='text-2xl font-bold tracking-tight'>Settings</h1>

        <section className='mt-6'>
          <SectionLabel>Appearance</SectionLabel>
          {mounted ? <ThemeSeg /> : <div className='h-10 w-48 rounded-xl bg-secondary/40' />}
        </section>

        <section className='mt-7'>
          <SectionLabel>Day wallpaper</SectionLabel>
          <WallpaperRow which='light' />
        </section>

        <section className='mt-6'>
          <SectionLabel>Night wallpaper</SectionLabel>
          <WallpaperRow which='dark' />
        </section>

        <section className='mt-7'>
          <SectionLabel>Motion</SectionLabel>
          <label className='flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3'>
            <span>
              <span className='block text-sm font-semibold'>Reduce motion</span>
              <span className='block text-xs text-muted-foreground'>Calmer window & dock animations</span>
            </span>
            <input
              type='checkbox'
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className='h-5 w-5 accent-[var(--brand-red)]'
            />
          </label>
        </section>

        <section className='mt-7'>
          <SectionLabel>Desktop</SectionLabel>
          <button
            type='button'
            onClick={() => useWindowStore.setState({ windows: [], focusedId: null })}
            className='rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary'
          >
            Close all windows
          </button>
        </section>

        <section className='mt-8 border-t pt-5'>
          <div className='flex items-center gap-3'>
            <span className='grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg'>🖥️</span>
            <div>
              <div className='text-sm font-bold'>Eddie Kranz v1.0</div>
              <div className='text-xs text-muted-foreground'>Built with Next.js, React, Tailwind &amp; Framer Motion</div>
            </div>
          </div>
        </section>
      </div>
    </AppScroll>
  );
}
