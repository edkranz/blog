'use client';

import { create } from 'zustand';
import { useFsStore } from './fs-store';

/**
 * Machine power state. `panic` is the kernel panic you get for `rm -rf /` — it is
 * sticky for the browser session (sessionStorage), so a plain reload boots straight
 * back into the panic and only a deliberate power-cycle (or closing the tab) clears it.
 */
export type PowerState = 'on' | 'panic' | 'off';

const PANIC_KEY = 'eddie-os-panic';

type PowerStore = {
  state: PowerState;
  /** The stop code shown on the panic screen. */
  reason: string;
  panic: (reason: string) => void;
  shutdown: () => void;
  /** A normal restart (the `reboot` command, or turning it back on after `shutdown`). */
  reboot: () => void;
  /** Power-cycle out of a panic: clear the sticky flag, factory-reset the disk you wiped, reboot. */
  recover: () => void;
};

function readPanic(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(PANIC_KEY);
  } catch {
    return null;
  }
}

export const usePower = create<PowerStore>((set) => {
  const stored = readPanic();
  return {
    state: stored ? 'panic' : 'on',
    reason: stored ?? '',
    panic: (reason) => {
      try {
        window.sessionStorage.setItem(PANIC_KEY, reason);
      } catch {}
      // You deleted the disk. The disk is deleted.
      useFsStore.getState().reset();
      set({ state: 'panic', reason });
    },
    shutdown: () => set({ state: 'off' }),
    reboot: () => window.location.reload(),
    recover: () => {
      try {
        window.sessionStorage.removeItem(PANIC_KEY);
      } catch {}
      useFsStore.getState().reset();
      window.location.reload();
    },
  };
});
