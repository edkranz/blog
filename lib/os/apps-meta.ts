import type { AppId, AppMeta } from './types';

export const APP_META: Record<AppId, AppMeta> = {
  welcome: {
    id: 'welcome',
    name: 'Welcome',
    iconId: 'monogram',
    accent: 'var(--brand-red)',
    defaultSize: { w: 480, h: 568 },
    minSize: { w: 340, h: 420 },
    single: true,
    dock: true,
    desktop: false,
  },
  about: {
    id: 'about',
    name: 'About Me',
    iconId: 'face',
    accent: 'var(--brand-blue)',
    defaultSize: { w: 720, h: 600 },
    minSize: { w: 360, h: 360 },
    single: true,
    dock: true,
    desktop: true,
  },
  blog: {
    id: 'blog',
    name: 'Blog',
    iconId: 'book',
    accent: 'var(--brand-purple)',
    defaultSize: { w: 780, h: 640 },
    minSize: { w: 360, h: 380 },
    single: true,
    dock: true,
    desktop: true,
  },
  projects: {
    id: 'projects',
    name: 'Projects',
    iconId: 'grid',
    accent: 'var(--brand-green)',
    defaultSize: { w: 840, h: 620 },
    minSize: { w: 360, h: 380 },
    single: true,
    dock: true,
    desktop: true,
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    iconId: 'terminal',
    accent: '#1d1f27',
    defaultSize: { w: 660, h: 440 },
    minSize: { w: 380, h: 260 },
    single: true,
    dock: true,
    desktop: false,
  },
  minesweeper: {
    id: 'minesweeper',
    name: 'Minesweeper',
    iconId: 'mine',
    accent: 'var(--brand-yellow)',
    defaultSize: { w: 392, h: 496 },
    minSize: { w: 392, h: 496 },
    single: true,
    dock: true,
    desktop: true,
  },
  tetris: {
    id: 'tetris',
    name: 'Tetris',
    iconId: 'tetris',
    accent: '#29c7d6',
    defaultSize: { w: 440, h: 600 },
    minSize: { w: 392, h: 544 },
    single: true,
    dock: true,
    desktop: true,
  },
  contact: {
    id: 'contact',
    name: 'Contact',
    iconId: 'mail',
    accent: 'var(--brand-orange)',
    defaultSize: { w: 460, h: 552 },
    minSize: { w: 340, h: 380 },
    single: true,
    dock: true,
    desktop: false,
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    iconId: 'gear',
    accent: '#8a8d99',
    defaultSize: { w: 620, h: 524 },
    minSize: { w: 360, h: 380 },
    single: true,
    dock: true,
    desktop: false,
  },
  trash: {
    id: 'trash',
    name: 'Trash',
    iconId: 'trash',
    accent: '#9aa0ab',
    defaultSize: { w: 480, h: 380 },
    minSize: { w: 320, h: 280 },
    single: true,
    dock: true,
    desktop: true,
  },
};

export function getAppMeta(id: AppId): AppMeta {
  return APP_META[id];
}

/** Order of launchers in the dock (trash is rendered separately, after a divider). */
export const DOCK_ORDER: AppId[] = ['welcome', 'about', 'blog', 'projects', 'terminal', 'minesweeper', 'tetris', 'contact', 'settings'];

/** Order of icons on the desktop surface. */
export const DESKTOP_ORDER: AppId[] = ['about', 'blog', 'projects', 'minesweeper', 'tetris', 'trash'];
