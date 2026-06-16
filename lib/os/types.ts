export type AppId =
  | 'welcome'
  | 'about'
  | 'blog'
  | 'projects'
  | 'terminal'
  | 'minesweeper'
  | 'tetris'
  | 'contact'
  | 'settings'
  | 'trash';

export type IconId = 'face' | 'user' | 'monogram' | 'book' | 'grid' | 'terminal' | 'mine' | 'tetris' | 'mail' | 'gear' | 'trash';

export type Rect = { x: number; y: number; w: number; h: number };

export type AppMeta = {
  id: AppId;
  name: string;
  iconId: IconId;
  accent: string; // CSS color for the icon tile
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  single: boolean; // only one window instance at a time
  dock: boolean; // appears in the dock
  desktop: boolean; // appears as a desktop icon
};

export type WindowProps = Record<string, unknown>;

export type OSWindow = {
  id: string;
  appId: AppId;
  title: string;
  rect: Rect;
  z: number;
  minimized: boolean;
  maximized: boolean;
  prevRect?: Rect;
  props?: WindowProps;
  /** bumped each time the app is asked to do something while already open */
  nonce: number;
};
