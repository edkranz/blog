'use client';

import { create } from 'zustand';
import { getAppMeta } from './apps-meta';
import { DOCK_RESERVED, MENUBAR_H, WINDOW_MARGIN, getWorkArea } from './constants';
import type { AppId, OSWindow, Rect, WindowProps } from './types';

let idCounter = 0;
const makeId = (appId: AppId) => `${appId}-${++idCounter}`;

function viewport() {
  if (typeof window === 'undefined') return { w: 1280, h: 800 };
  return { w: window.innerWidth, h: window.innerHeight };
}

function spawnRect(appId: AppId, spawnCount: number): Rect {
  const meta = getAppMeta(appId);
  const { w: vw, h: vh } = viewport();
  const w = Math.min(meta.defaultSize.w, vw - WINDOW_MARGIN * 2);
  const h = Math.min(meta.defaultSize.h, vh - MENUBAR_H - DOCK_RESERVED);
  const cascade = (spawnCount % 6) * 26;
  let x = Math.round((vw - w) / 2) + cascade - 64;
  let y = MENUBAR_H + 28 + cascade;
  x = Math.max(WINDOW_MARGIN, Math.min(x, vw - w - WINDOW_MARGIN));
  y = Math.max(MENUBAR_H + WINDOW_MARGIN, Math.min(y, vh - DOCK_RESERVED));
  return { x, y, w, h };
}

type OpenOpts = { title?: string; props?: WindowProps };

type WindowStore = {
  windows: OSWindow[];
  zTop: number;
  focusedId: string | null;
  spawnCount: number;
  fullscreenId: string | null;

  openApp: (appId: AppId, opts?: OpenOpts) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, rect: Rect) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  enterFullscreen: (id: string) => void;
  exitFullscreen: () => void;
  updateProps: (id: string, props: WindowProps, title?: string) => void;
  isOpen: (appId: AppId) => boolean;
};

function topmostOther(windows: OSWindow[], excludeId: string): string | null {
  const candidates = windows.filter((w) => w.id !== excludeId && !w.minimized);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a.z > b.z ? a : b)).id;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  zTop: 10,
  focusedId: null,
  spawnCount: 0,
  fullscreenId: null,

  openApp: (appId, opts) => {
    const meta = getAppMeta(appId);
    const state = get();
    if (meta.single) {
      const existing = state.windows.find((w) => w.appId === appId);
      if (existing) {
        const z = state.zTop + 1;
        set({
          zTop: z,
          focusedId: existing.id,
          windows: state.windows.map((w) =>
            w.id === existing.id
              ? {
                  ...w,
                  z,
                  minimized: false,
                  title: opts?.title ?? w.title,
                  props: opts?.props ? { ...w.props, ...opts.props } : w.props,
                  nonce: opts ? w.nonce + 1 : w.nonce,
                }
              : w,
          ),
        });
        return;
      }
    }
    const z = state.zTop + 1;
    const win: OSWindow = {
      id: makeId(appId),
      appId,
      title: opts?.title ?? meta.name,
      rect: spawnRect(appId, state.spawnCount),
      z,
      minimized: false,
      maximized: false,
      props: opts?.props,
      nonce: 0,
    };
    set({ windows: [...state.windows, win], zTop: z, focusedId: win.id, spawnCount: state.spawnCount + 1 });
  },

  closeWindow: (id) =>
    set((s) => {
      const windows = s.windows.filter((w) => w.id !== id);
      return {
        windows,
        focusedId: s.focusedId === id ? topmostOther(s.windows, id) : s.focusedId,
        fullscreenId: s.fullscreenId === id ? null : s.fullscreenId,
      };
    }),

  focusWindow: (id) =>
    set((s) => {
      const target = s.windows.find((w) => w.id === id);
      if (!target) return s;
      if (s.focusedId === id && !target.minimized && target.z === s.zTop) return s;
      const z = s.zTop + 1;
      return {
        zTop: z,
        focusedId: id,
        windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
      };
    }),

  moveWindow: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, rect: { ...w.rect, x, y }, maximized: false } : w)),
    })),

  resizeWindow: (id, rect) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, rect, maximized: false } : w)),
    })),

  minimizeWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
      focusedId: s.focusedId === id ? topmostOther(s.windows, id) : s.focusedId,
      fullscreenId: s.fullscreenId === id ? null : s.fullscreenId,
    })),

  toggleMaximize: (id) =>
    set((s) => {
      const { w: vw, h: vh } = viewport();
      const area = getWorkArea(vw, vh);
      const z = s.zTop + 1;
      return {
        zTop: z,
        focusedId: id,
        windows: s.windows.map((w) => {
          if (w.id !== id) return w;
          if (w.maximized && w.prevRect) {
            return { ...w, rect: w.prevRect, maximized: false, prevRect: undefined, z, minimized: false };
          }
          return { ...w, prevRect: w.rect, rect: area, maximized: true, z, minimized: false };
        }),
      };
    }),

  enterFullscreen: (id) =>
    set((s) => {
      if (!s.windows.some((w) => w.id === id)) return s;
      const z = s.zTop + 1;
      return {
        fullscreenId: id,
        focusedId: id,
        zTop: z,
        windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
      };
    }),

  exitFullscreen: () => set({ fullscreenId: null }),

  updateProps: (id, props, title) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, props: { ...w.props, ...props }, title: title ?? w.title } : w)),
    })),

  isOpen: (appId) => get().windows.some((w) => w.appId === appId),
}));
