'use client';

import type { AppId } from '@/lib/os/types';
import dynamic from 'next/dynamic';
import type { AppContentProps } from './types';
import { WelcomeApp } from './welcome-app';

// Code-split each app so the initial bundle stays small (faster hydration → better LCP).
// Heavy deps (react-markdown + Prism + giscus in Blog, game logic, canvases) only load
// when their window is opened. Welcome stays eager since it auto-opens on boot.
const loading = () => <div className='grid h-full place-items-center text-sm text-muted-foreground'>Loading…</div>;

const AboutApp = dynamic(() => import('./about-app').then((m) => m.AboutApp), { ssr: false, loading });
const BlogApp = dynamic(() => import('./blog-app').then((m) => m.BlogApp), { ssr: false, loading });
const ProjectsApp = dynamic(() => import('./projects-app').then((m) => m.ProjectsApp), { ssr: false, loading });
const TerminalApp = dynamic(() => import('./terminal-app').then((m) => m.TerminalApp), { ssr: false, loading });
const MinesweeperApp = dynamic(() => import('./minesweeper-app').then((m) => m.MinesweeperApp), { ssr: false, loading });
const TetrisApp = dynamic(() => import('./tetris-app').then((m) => m.TetrisApp), { ssr: false, loading });
const ContactApp = dynamic(() => import('./contact-app').then((m) => m.ContactApp), { ssr: false, loading });
const SettingsApp = dynamic(() => import('./settings-app').then((m) => m.SettingsApp), { ssr: false, loading });
const TrashApp = dynamic(() => import('./trash-app').then((m) => m.TrashApp), { ssr: false, loading });

export const APP_REGISTRY: Record<AppId, (props: AppContentProps) => React.ReactNode> = {
  welcome: () => <WelcomeApp />,
  about: () => <AboutApp />,
  blog: (p) => <BlogApp win={p.win} />,
  projects: () => <ProjectsApp />,
  terminal: (p) => <TerminalApp win={p.win} />,
  minesweeper: () => <MinesweeperApp />,
  tetris: (p) => <TetrisApp win={p.win} />,
  contact: () => <ContactApp />,
  settings: () => <SettingsApp />,
  trash: () => <TrashApp />,
};
