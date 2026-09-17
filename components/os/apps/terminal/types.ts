import type { VDir } from '@/lib/os/filesystem';
import type { Wallpaper } from '@/lib/os/prefs';
import type { AppId, OSWindow } from '@/lib/os/types';
import type { PostMeta } from '@/lib/posts';

/** A styled run of text; a terminal line is a list of them. */
export type Seg = { t: string; c?: string };
export type Line = Seg[];

export const out = (t: string, c = 'text-zinc-300'): Line => [{ t, c }];
export const lineText = (l: Line): string => l.map((s) => s.t).join('');

export const C = {
  err: 'text-rose-400',
  ok: 'text-emerald-400',
  head: 'text-amber-300',
  dim: 'text-zinc-500',
  dimmer: 'text-zinc-600',
  link: 'text-sky-300',
  dir: 'text-sky-300 font-semibold',
  app: 'text-emerald-300',
  image: 'text-fuchsia-300',
  text: 'text-zinc-300',
  bright: 'text-zinc-100',
  red: 'text-[var(--brand-red)]',
};

/** Everything the shell can do to the OS *outside* the file system. Supplied by the Terminal UI. */
export type ShellSys = {
  openApp: (appId: AppId, opts?: { title?: string; props?: Record<string, unknown> }) => void;
  closeWindow: (id: string) => void;
  windows: () => OSWindow[];
  /** The id of the window this shell lives in. */
  selfId: string;
  getTheme: () => string | undefined;
  setTheme: (mode: 'light' | 'dark') => void;
  setWallpaper: (id: Wallpaper) => void;
  posts: PostMeta[];
  clear: () => void;
  exit: () => void;
  openNano: (dir: string[], name: string, content: string) => void;
  /** Start the `rm -rf /` theatrics; the UI prints the carnage, then panics the machine. */
  meltdown: (reason: string) => void;
  shutdown: () => void;
  reboot: () => void;
};

/** Session-scoped shell state: lives as long as the terminal window does. */
export type ShellState = {
  vars: Record<string, string>;
  aliases: Record<string, string>;
  history: string[];
  lastStatus: number;
};

/**
 * Execution context threaded through every command. `getRoot`/`setRoot` are closures
 * so a compound line (`mkdir a && cd a && touch b`) sees each mutation immediately,
 * without waiting for a React re-render.
 */
export type Env = {
  getCwd: () => string[];
  setCwd: (c: string[]) => void;
  getRoot: () => VDir;
  setRoot: (r: VDir) => void;
  print: (...lines: Line[]) => void;
  /** Text piped in from the previous command, or null when this is the head of a pipeline. */
  stdin: string | null;
  state: ShellState;
  sys: ShellSys;
  /** Re-enter the interpreter (for `sh`, `xargs`, aliases…). */
  exec: (line: string, env: Env) => void;
  depth: number;
};

export type Ctx = {
  env: Env;
  /** The command name as typed (after alias expansion). */
  name: string;
  /** Positional (non-flag) arguments. */
  args: string[];
  /** Boolean flags: `-la` → {l, a}; `--all` → {all}. */
  flags: Set<string>;
  /** Valued options: `-n 5`, `-n5`, `--name '*.md'`, `-5` (→ n). */
  opts: Record<string, string>;
  /** Every argument verbatim. */
  raw: string[];
  cwd: string[];
  root: VDir;
  stdin: string | null;
  print: (...lines: Line[]) => void;
  /** Print one plain line. */
  out: (t: string, c?: string) => void;
  /** Print an error line and set `$?` to 1. */
  err: (msg: string) => void;
  /**
   * Lines of input for a text-processing command: the named files concatenated,
   * else stdin, else null (the caller should print its usage).
   */
  readLines: (files?: string[]) => string[] | null;
};

export type CmdGroup = 'fs' | 'text' | 'shell' | 'system' | 'fun';

export type Cmd = {
  name: string;
  usage: string;
  desc: string;
  group: CmdGroup;
  aliases?: string[];
  /** Options that consume a value (`-n 5`, `-name foo`). */
  valued?: string[];
  /** Left out of `help` (easter eggs, joke commands). */
  hidden?: boolean;
  run: (ctx: Ctx) => void;
};
