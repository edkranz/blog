'use client';

import { getAppMeta } from '@/lib/os/apps-meta';
import { getWorkArea } from '@/lib/os/constants';
import { useIsMobile, usePrefersReducedMotion, useViewportSize } from '@/lib/os/hooks';
import { usePrefs } from '@/lib/os/prefs';
import { useWindowStore } from '@/lib/os/store';
import type { OSWindow } from '@/lib/os/types';
import { AnimatePresence } from 'motion/react';
import { APP_REGISTRY } from './apps/registry';
import { Window } from './window';

export function WindowManager() {
  const windows = useWindowStore((s) => s.windows);
  const focusedId = useWindowStore((s) => s.focusedId);
  const fullscreenId = useWindowStore((s) => s.fullscreenId);
  const mobile = useIsMobile();
  const { w: vw, h: vh } = useViewportSize();
  const systemReduce = usePrefersReducedMotion();
  const prefReduce = usePrefs((s) => s.reduceMotion);
  const reduceMotion = systemReduce || prefReduce;

  const visible = windows.filter((w) => !w.minimized);

  // On phones, only the focused (or topmost) window is shown, maximised.
  let toRender: OSWindow[] = visible;
  if (mobile && visible.length > 0) {
    const top = visible.reduce((a, b) => (a.z > b.z ? a : b));
    const area = getWorkArea(vw, vh);
    toRender = [{ ...top, rect: area, maximized: true }];
  }

  return (
    <div className='pointer-events-none absolute inset-0'>
      <AnimatePresence>
        {toRender.map((win) => (
          <Window
            key={win.id}
            win={win}
            meta={getAppMeta(win.appId)}
            focused={win.id === focusedId}
            mobile={mobile}
            reduceMotion={reduceMotion}
            fullscreen={win.id === fullscreenId}
          >
            {APP_REGISTRY[win.appId]({ win })}
          </Window>
        ))}
      </AnimatePresence>
    </div>
  );
}
