'use client';

import { useIsMobile, useMounted } from '@/lib/os/hooks';
import { type Wallpaper, usePrefs, wallpaperClass } from '@/lib/os/prefs';
import { parseRoute, pathForWindow } from '@/lib/os/routes';
import { useWindowStore } from '@/lib/os/store';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';
import { BootScreen } from './boot-screen';
import { DesktopIcons } from './desktop-icons';
import { Dock } from './dock';
import { MenuBar } from './menu-bar';
import { WindowManager } from './window-manager';

export function Desktop({ initialPath }: { initialPath?: string[] }) {
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const wallpaperLight = usePrefs((s) => s.wallpaperLight);
  const wallpaperDark = usePrefs((s) => s.wallpaperDark);
  const openApp = useWindowStore((s) => s.openApp);
  const focusedId = useWindowStore((s) => s.focusedId);
  const fullscreenId = useWindowStore((s) => s.fullscreenId);
  const windows = useWindowStore((s) => s.windows);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('eddie-os-booted') === '1') setBooted(true);
  }, []);

  const finishBoot = useCallback(() => {
    sessionStorage.setItem('eddie-os-booted', '1');
    setBooted(true);
  }, []);

  // Greet with Welcome — or honour a deep-link path (/blog/slug, /about, …, optionally ?view=full).
  useEffect(() => {
    if (!booted || useWindowStore.getState().windows.length > 0) return;
    const { appId, slug, fullscreen } = parseRoute(initialPath, window.location.search);
    if (appId === 'blog') openApp('blog', slug ? { props: { slug }, title: 'Blog' } : undefined);
    else if (appId) openApp(appId);
    else openApp('welcome');
    if (fullscreen) {
      const st = useWindowStore.getState();
      if (st.focusedId) st.enterFullscreen(st.focusedId);
    }
  }, [booted, openApp, initialPath]);

  // Keep the address bar in sync with the focused window (+ ?view=full when fullscreen).
  useEffect(() => {
    if (!booted) return;
    const win = windows.find((w) => w.id === focusedId);
    const slug = win?.appId === 'blog' ? (win.props?.slug as string | undefined) : undefined;
    let path = pathForWindow(win?.appId ?? null, slug);
    if (fullscreenId && win && win.id === fullscreenId) path += '?view=full';
    if (window.location.pathname + window.location.search !== path) {
      window.history.replaceState(null, '', path);
    }
  }, [focusedId, windows, booted, fullscreenId]);

  // Esc exits fullscreen.
  useEffect(() => {
    if (!fullscreenId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useWindowStore.getState().exitFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenId]);

  const wp: Wallpaper = mounted ? (resolvedTheme === 'dark' ? wallpaperDark : wallpaperLight) : 'cream';

  return (
    <main className='fixed inset-0 overflow-hidden'>
      <div className={cn('grain absolute inset-0', wallpaperClass(wp))} />

      {mounted && !isMobile ? <DesktopIcons /> : null}
      <WindowManager />
      <MenuBar />
      <Dock />

      <AnimatePresence>{mounted && !booted ? <BootScreen onDone={finishBoot} /> : null}</AnimatePresence>
    </main>
  );
}
