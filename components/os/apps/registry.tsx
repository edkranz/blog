import type { AppId } from '@/lib/os/types';
import { AboutApp } from './about-app';
import { BlogApp } from './blog-app';
import { ContactApp } from './contact-app';
import { MinesweeperApp } from './minesweeper-app';
import { ProjectsApp } from './projects-app';
import { SettingsApp } from './settings-app';
import { TerminalApp } from './terminal-app';
import { TetrisApp } from './tetris-app';
import { TrashApp } from './trash-app';
import type { AppContentProps } from './types';
import { WelcomeApp } from './welcome-app';

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
