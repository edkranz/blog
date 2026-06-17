'use client';

import { useIsMobile, useMounted } from '@/lib/os/hooks';
import { type Wallpaper, usePrefs, wallpaperClass } from '@/lib/os/prefs';
import { parseRoute, pathForWindow } from '@/lib/os/routes';
import { useWindowStore } from '@/lib/os/store';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
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
  const [ready, setReady] = useState(false);

  // Once hydrated: open the initial window (Welcome, or a deep-link), then fade the loader.
  useEffect(() => {
    if (!mounted) return;
    if (useWindowStore.getState().windows.length === 0) {
      const { appId, slug, fullscreen } = parseRoute(initialPath, window.location.search);
      if (appId === 'blog') openApp('blog', slug ? { props: { slug }, title: 'Blog' } : undefined);
      else if (appId) openApp(appId);
      else openApp('welcome');
      if (fullscreen) {
        const st = useWindowStore.getState();
        if (st.focusedId) st.enterFullscreen(st.focusedId);
      }
    }
    const id = setTimeout(() => setReady(true), 700);
    return () => clearTimeout(id);
  }, [mounted, openApp, initialPath]);

  // Keep the address bar in sync with the focused window (+ ?view=full when fullscreen).
  useEffect(() => {
    if (!mounted) return;
    // Don't touch a giscus OAuth callback URL (…?giscus=<token>): the giscus client
    // needs to read that param to finish sign-in, and it strips the param itself once done.
    if (window.location.search.includes('giscus=')) return;
    const win = windows.find((w) => w.id === focusedId);
    const slug = win?.appId === 'blog' ? (win.props?.slug as string | undefined) : undefined;
    let path = pathForWindow(win?.appId ?? null, slug);
    if (fullscreenId && win && win.id === fullscreenId) path += '?view=full';
    if (window.location.pathname + window.location.search !== path) {
      window.history.replaceState(null, '', path);
    }
  }, [focusedId, windows, mounted, fullscreenId]);

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
    <div className='os-root fixed inset-0 overflow-hidden'>
      <div className={cn('grain absolute inset-0', wallpaperClass(wp))} />

      {mounted && !isMobile ? <DesktopIcons /> : null}
      <WindowManager />
      <MenuBar />
      <Dock />

      {/* Real loading spinner — server-rendered + pure CSS, so it paints on first paint
          (before the JS bundle hydrates) and fades once the OS has mounted and opened. */}
      <div className={cn('boot-loader', ready && 'boot-loader--done')} aria-hidden>
        <img src='/icons/face.png' alt='' width={76} height={76} className='boot-loader__icon' />
        <div className='boot-loader__bar'>
          <span className='boot-loader__fill' />
        </div>
      </div>
    </div>
  );
}
