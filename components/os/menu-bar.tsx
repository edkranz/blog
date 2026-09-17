'use client';

import { getAppMeta } from '@/lib/os/apps-meta';
import { MENUBAR_H } from '@/lib/os/constants';
import { useMounted } from '@/lib/os/hooks';
import { usePower } from '@/lib/os/power';
import { useWindowStore } from '@/lib/os/store';
import { BatteryMedium, Moon, Sun, Volume2, Wifi } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { AppIcon } from './icons';
import { Dropdown, type MenuEntry } from './menu';

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

/** Edit-menu commands act on whatever input has focus (the menu never steals it). */
const exec = (cmd: string) => () => document.execCommand(cmd);
const paste = async () => {
  try {
    const text = await navigator.clipboard.readText();
    document.execCommand('insertText', false, text);
  } catch {}
};

export function MenuBar() {
  const windows = useWindowStore((s) => s.windows);
  const focusedId = useWindowStore((s) => s.focusedId);
  const fullscreenId = useWindowStore((s) => s.fullscreenId);
  const { openApp, closeWindow, focusWindow, minimizeWindow, toggleMaximize, enterFullscreen, exitFullscreen } = useWindowStore.getState();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [openId, setOpenId] = useState<string | null>(null);

  const active = windows.find((w) => w.id === focusedId);
  // With nothing focused the desktop belongs to Files, this OS's Finder.
  const appId = active?.appId ?? 'files';
  const appName = getAppMeta(appId).name;
  const sameApp = windows.filter((w) => w.appId === appId);

  const logo: MenuEntry[] = [
    { label: 'About This Site', onSelect: () => openApp('welcome') },
    { label: 'About Me', onSelect: () => openApp('about') },
    { label: 'System Settings…', onSelect: () => openApp('settings') },
    'sep',
    { label: 'View Source', onSelect: () => window.open('https://github.com/edkranz/blog', '_blank', 'noopener') },
    'sep',
    { label: 'Restart…', onSelect: () => usePower.getState().reboot() },
    { label: 'Shut Down…', onSelect: () => usePower.getState().shutdown() },
  ];

  const app: MenuEntry[] = [
    { label: `About ${appName}`, onSelect: () => openApp(appId) },
    'sep',
    { label: `Hide ${appName}`, disabled: !active, onSelect: () => active && minimizeWindow(active.id) },
    { label: `Quit ${appName}`, disabled: sameApp.length === 0, onSelect: () => sameApp.forEach((w) => closeWindow(w.id)) },
  ];

  const file: MenuEntry[] = [
    { label: 'New Files Window', onSelect: () => openApp('files') },
    { label: 'New Terminal Window', onSelect: () => openApp('terminal') },
    'sep',
    { label: 'Close Window', disabled: !active, onSelect: () => active && closeWindow(active.id) },
    { label: 'Close All Windows', disabled: windows.length === 0, onSelect: () => windows.forEach((w) => closeWindow(w.id)) },
  ];

  const edit: MenuEntry[] = [
    { label: 'Undo', onSelect: exec('undo') },
    { label: 'Redo', onSelect: exec('redo') },
    'sep',
    { label: 'Cut', onSelect: exec('cut') },
    { label: 'Copy', onSelect: exec('copy') },
    { label: 'Paste', onSelect: paste },
    { label: 'Select All', onSelect: exec('selectAll') },
  ];

  const view: MenuEntry[] = [
    { label: 'Day', checked: mounted && theme === 'light', onSelect: () => setTheme('light') },
    { label: 'Night', checked: mounted && theme === 'dark', onSelect: () => setTheme('dark') },
    { label: 'Auto', checked: mounted && theme === 'system', onSelect: () => setTheme('system') },
    'sep',
    { label: 'Wallpaper…', onSelect: () => openApp('settings') },
    'sep',
    fullscreenId
      ? { label: 'Exit Full Screen', onSelect: exitFullscreen }
      : { label: 'Enter Full Screen', disabled: !active, onSelect: () => active && enterFullscreen(active.id) },
  ];

  const win: MenuEntry[] = [
    { label: 'Minimize', disabled: !active, onSelect: () => active && minimizeWindow(active.id) },
    { label: 'Zoom', disabled: !active, onSelect: () => active && toggleMaximize(active.id) },
    ...(windows.length
      ? ['sep' as const, ...windows.map<MenuEntry>((w) => ({ label: w.title, checked: w.id === focusedId, onSelect: () => focusWindow(w.id) }))]
      : []),
  ];

  const menu = { openId, setOpenId };

  return (
    <header
      className='os-panel absolute inset-x-0 top-0 flex select-none items-center justify-between border-b px-2.5 text-[13px] text-foreground/85'
      style={{ height: MENUBAR_H, zIndex: 9500 }}
    >
      <div className='flex items-center gap-1'>
        <Dropdown
          id='logo'
          title={<AppIcon iconId='face' size={18} rounded={5} />}
          entries={logo}
          titleClassName='grid h-[22px] w-[26px] place-items-center px-0 py-0'
          {...menu}
        />
        <Dropdown id='app' title={appName} entries={app} titleClassName='font-bold' {...menu} />
        <nav className='hidden items-center gap-1 font-medium text-foreground/70 sm:flex'>
          <Dropdown id='file' title='File' entries={file} {...menu} />
          <Dropdown id='edit' title='Edit' entries={edit} {...menu} />
          <Dropdown id='view' title='View' entries={view} {...menu} />
          <Dropdown id='window' title='Window' entries={win} {...menu} />
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
