'use client';

import { HOME, absPath, dirAt, displayPath, fsWrite, listChildren, nodeAt, resolvePath } from '@/lib/os/filesystem';
import { useFsStore } from '@/lib/os/fs-store';
import { usePower } from '@/lib/os/power';
import { WALLPAPERS, usePrefs } from '@/lib/os/prefs';
import { useWindowStore } from '@/lib/os/store';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { useOSData } from '../../os-context';
import type { AppContentProps } from '../types';
import { COMMAND_WORDS, runScript } from './commands';
import { walk } from './fsx';
import { execLine, expandHistory } from './shell';
import { C, type Env, type Line, type ShellState, type ShellSys, out } from './types';

const MAX_LINES = 3000;

const DEFAULT_VARS: Record<string, string> = {
  HOME: '/home/ed',
  USER: 'ed',
  SHELL: '/bin/eksh',
  TERM: 'xterm-256color',
  HOSTNAME: 'kranz.au',
  LANG: 'en_AU.UTF-8',
  PATH: '/usr/local/bin:/usr/bin:/bin',
  EDITOR: 'nano',
  DOG: 'zeppelin',
};

const promptSegs = (cwd: string[]): Line => [
  { t: 'ed@kranz.au', c: 'text-emerald-400' },
  { t: ':', c: C.dim },
  { t: displayPath(cwd), c: 'text-sky-400' },
  { t: '$ ', c: C.dim },
];

const commonPrefix = (xs: string[]) =>
  xs.reduce((p, x) => {
    let i = 0;
    while (i < p.length && i < x.length && p[i] === x[i]) i++;
    return p.slice(0, i);
  });

const lastLogin = () => new Date().toString().replace(/ GMT.*$/, '');

const GLYPHS = '█▓▒░▚▞╬╳¥§Ø';
const garble = (s: string, amount: number) =>
  [...s].map((ch) => (ch !== '/' && Math.random() < amount ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : ch)).join('');

const PHANTOM_FILES = [
  '/bin/ls',
  '/bin/cat',
  '/bin/rm',
  '/etc/passwd',
  '/etc/hosts',
  '/etc/eksh.rc',
  '/usr/lib/libreact.so.19',
  '/usr/lib/libnext.so.16',
  '/usr/share/wallpapers',
  '/var/log/regrets.log',
  '/var/lib/zustand/windows.db',
  '/boot/vmlinuz-eddie',
  '/proc/1/cmdline',
  '/dev/coffee',
  '/lib/eksh.sys',
];

export function TerminalApp({ win }: AppContentProps) {
  const openApp = useWindowStore((s) => s.openApp);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const { resolvedTheme, setTheme } = useTheme();
  const { posts } = useOSData();
  const root = useFsStore((s) => s.root);
  const setRoot = useFsStore((s) => s.setRoot);
  const rootRef = useRef(root);
  rootRef.current = root;

  const [cwd, setCwd] = useState<string[]>(HOME);
  const cwdRef = useRef(cwd);
  cwdRef.current = cwd;
  const [lines, setLines] = useState<Line[]>(() => [out(`Last login: ${lastLogin()} on ttys001`, C.dim)]);
  const [input, setInput] = useState('');
  const [histIdx, setHistIdx] = useState(-1);
  const [editor, setEditor] = useState<{ dir: string[]; name: string; content: string; dirty: boolean; status: string } | null>(null);
  const [melting, setMelting] = useState<'no' | 'yes' | 'glitch'>('no');
  const shellState = useRef<ShellState>({ vars: { ...DEFAULT_VARS }, aliases: {}, history: [], lastStatus: 0 });
  const timers = useRef<number[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const print = (...newLines: Line[]) =>
    setLines((prev) => (prev.length + newLines.length > MAX_LINES ? [...prev, ...newLines].slice(-MAX_LINES) : [...prev, ...newLines]));
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  // If the cwd gets removed (rm / reset), fall back home.
  useEffect(() => {
    if (!dirAt(root, cwd)) setCwd(HOME);
  }, [root, cwd]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** The `rm -rf /` show: delete everything on screen, corrupt, segfault, panic. */
  const meltdown = (reason: string) => {
    if (melting !== 'no') return;
    setMelting('yes');
    const victims = reason === 'FORK_BOMB_DETONATED' ? [] : [...[...walk(rootRef.current, [])].map(({ parts }) => absPath(parts)), ...PHANTOM_FILES];
    let i = 0;
    let forks = 1;
    const total = reason === 'FORK_BOMB_DETONATED' ? 17 : victims.length;
    const step = () => {
      const progress = i / total;
      if (reason === 'FORK_BOMB_DETONATED') {
        forks *= 2;
        print([
          { t: `eksh: fork: retry: Resource temporarily unavailable  `, c: progress > 0.5 ? C.err : C.dim },
          { t: `(${forks.toLocaleString()} processes)`, c: C.head },
        ]);
        i++;
      } else {
        const batch = progress < 0.4 ? 1 : progress < 0.7 ? 3 : 6;
        for (let k = 0; k < batch && i < total; k++, i++) {
          const p = victims[i];
          const g = progress > 0.55 ? (progress - 0.55) * 1.6 : 0;
          print([
            { t: 'rm: removing ', c: g ? C.err : C.dim },
            { t: g ? garble(p, g) : p, c: g ? C.err : C.text },
          ]);
        }
      }
      if (i < total) return later(step, progress < 0.4 ? 90 : 45);
      if (reason === 'FORK_BOMB_DETONATED') print(out('eksh: fork: Cannot allocate memory', C.err), out('Killed', `${C.err} font-bold`));
      else print([{ t: "rm: cannot remove '/dev/dog': Device or resource busy (he's a good boy)", c: C.head }]);
      later(() => print(out('Segmentation fault (core dumped)', `${C.err} font-bold`)), 350);
      later(() => setMelting('glitch'), 600);
      later(() => usePower.getState().panic(reason), 1500);
    };
    step();
  };

  const sys: ShellSys = {
    openApp,
    closeWindow,
    windows: () => useWindowStore.getState().windows,
    selfId: win.id,
    getTheme: () => resolvedTheme,
    setTheme,
    setWallpaper: (id) => {
      const wp = WALLPAPERS.find((w) => w.id === id);
      if (wp) usePrefs.getState().setWallpaper(wp.dark ? 'dark' : 'light', id);
    },
    posts,
    clear: () => setLines([]),
    exit: () => closeWindow(win.id),
    openNano: (dir, name, content) => setEditor({ dir, name, content, dirty: false, status: '' }),
    meltdown,
    shutdown: () => usePower.getState().shutdown(),
    reboot: () => usePower.getState().reboot(),
  };

  /** An Env whose cwd/root are threaded locally, so `mkdir a && cd a && touch b` compounds. */
  const liveEnv = (): Env => {
    let lc = cwdRef.current;
    let lr = rootRef.current;
    return {
      getCwd: () => lc,
      setCwd: (c) => {
        lc = c;
        cwdRef.current = c;
        setCwd(c);
      },
      getRoot: () => lr,
      setRoot: (r) => {
        lr = r;
        rootRef.current = r;
        setRoot(r);
      },
      print,
      stdin: null,
      state: shellState.current,
      sys,
      exec: execLine,
      depth: 0,
    };
  };

  // Source ~/.config/eksh.rc once, like a real login shell (aliases, exports, motd).
  const sourced = useRef(false);
  useEffect(() => {
    if (sourced.current) return;
    sourced.current = true;
    const rc = nodeAt(rootRef.current, [...HOME, '.config', 'eksh.rc']);
    if (rc?.type === 'file' && rc.content) runScript(rc.content, liveEnv(), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = (raw: string) => {
    const line = expandHistory(raw, shellState.current.history);
    print([...promptSegs(cwd), { t: raw, c: C.bright }]);
    if (line !== raw) print(out(line, C.dim));
    if (line.trim()) shellState.current.history.push(line);
    execLine(line, liveEnv());
    print([]);
  };

  const saveEditor = () => {
    if (!editor) return;
    const res = fsWrite(rootRef.current, editor.dir, editor.name, editor.content, false);
    if (res.ok) {
      setRoot(res.root);
      setEditor({ ...editor, dirty: false, status: `[ Wrote ${editor.content ? editor.content.split('\n').length : 0} lines ]` });
    } else {
      setEditor({ ...editor, status: res.error });
    }
  };

  const onEditorKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault();
      saveEditor();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
      e.preventDefault();
      if (editor?.dirty) saveEditor();
      setEditor(null);
      print(out(`[ ${editor?.name} closed ]`, C.dim), []);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: en } = el;
      const next = `${editor?.content.slice(0, s)}  ${editor?.content.slice(en)}`;
      if (editor) setEditor({ ...editor, content: next, dirty: true });
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = s + 2;
      });
    }
  };

  /** Bash-style completion: fill the unique match / common prefix, or list the candidates. */
  const complete = () => {
    const tokens = input.split(/(\s+)/); // keep the whitespace so we can rebuild the line verbatim
    const last = tokens[tokens.length - 1];
    const isCommand = tokens.filter((t) => t.trim()).length <= 1 && !/\s$/.test(input);
    let candidates: string[];
    let base = '';
    if (isCommand) {
      const words = [...new Set([...COMMAND_WORDS, ...Object.keys(shellState.current.aliases)])];
      candidates = last ? words.filter((n) => n.startsWith(last.toLowerCase())) : [];
    } else {
      const cut = last.lastIndexOf('/');
      base = cut >= 0 ? last.slice(0, cut + 1) : '';
      const leaf = cut >= 0 ? last.slice(cut + 1) : last;
      const dirNode = nodeAt(rootRef.current, resolvePath(cwd, base || '.'));
      candidates =
        dirNode?.type === 'dir'
          ? listChildren(dirNode, leaf.startsWith('.'))
              .filter((k) => k.name.startsWith(leaf))
              .map((k) => (k.type === 'dir' ? `${k.name}/` : k.name))
          : [];
    }
    if (candidates.length === 0) return;
    const apply = (word: string, done: boolean) => {
      tokens[tokens.length - 1] = base + word;
      setInput(tokens.join('') + (done && !word.endsWith('/') ? ' ' : ''));
    };
    if (candidates.length === 1) return apply(candidates[0], true);
    const prefix = commonPrefix(candidates);
    if (prefix.length > (isCommand ? last : last.slice(base.length)).length) return apply(prefix, false);
    print([...promptSegs(cwd), { t: input, c: C.bright }], out(candidates.join('  '), C.dim));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (melting !== 'no') return e.preventDefault();
    const history = shellState.current.history;
    if (e.key === 'Enter') {
      run(input);
      setInput('');
      setHistIdx(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setInput(history[idx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= history.length) {
        setHistIdx(-1);
        setInput('');
      } else {
        setHistIdx(idx);
        setInput(history[idx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      complete();
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      setLines([]);
    } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      print([...promptSegs(cwd), { t: `${input}^C`, c: C.bright }]);
      setInput('');
      setHistIdx(-1);
    } else if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      setInput('');
    } else if (e.ctrlKey && (e.key === 'd' || e.key === 'D') && input === '') {
      e.preventDefault();
      closeWindow(win.id);
    }
  };

  // Block body on purpose: newer Chrome returns a Promise from scrollIntoView, which React
  // would otherwise treat as (and choke on as) the effect's cleanup.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lines]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (editor) textareaRef.current?.focus();
  }, [editor?.name]);

  return (
    <button
      type='button'
      tabIndex={-1}
      onClick={() => !editor && inputRef.current?.focus()}
      className={cn(
        'crt relative block h-full w-full cursor-text overflow-hidden bg-[#0c0d12] text-left font-mono text-[13px] leading-[1.5]',
        melting === 'glitch' && 'os-meltdown'
      )}
    >
      <div className='os-scroll h-full overflow-y-auto p-3.5'>
        {lines.map((line, i) => (
          <div key={i} className='whitespace-pre-wrap break-words'>
            {line.length === 0
              ? ' '
              : line.map((seg, j) => (
                  <span key={j} className={seg.c}>
                    {seg.t}
                  </span>
                ))}
          </div>
        ))}
        {melting === 'no' ? (
          <div className='flex whitespace-pre-wrap'>
            {promptSegs(cwd).map((seg, j) => (
              <span key={j} className={seg.c}>
                {seg.t}
              </span>
            ))}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize='off'
              autoComplete='off'
              autoFocus
              className='flex-1 border-0 bg-transparent p-0 text-zinc-100 caret-emerald-400 outline-none'
              aria-label='Terminal input'
            />
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {/* nano editor */}
      {editor && (
        <div className='absolute inset-0 z-10 flex flex-col bg-[#0c0d12] text-[13px] text-zinc-100'>
          <div className='flex items-center justify-between bg-zinc-200 px-3 py-1 text-[12px] font-semibold text-zinc-900'>
            <span>GNU nano 8.0</span>
            <span className='truncate px-2'>
              {editor.name}
              {editor.dirty ? ' *' : ''}
            </span>
            <span className='truncate text-zinc-600'>{displayPath(editor.dir)}</span>
          </div>
          <textarea
            ref={textareaRef}
            value={editor.content}
            onChange={(e) => setEditor({ ...editor, content: e.target.value, dirty: true, status: '' })}
            onKeyDown={onEditorKey}
            spellCheck={false}
            className='os-scroll flex-1 resize-none border-0 bg-transparent p-3 font-mono text-zinc-100 caret-emerald-400 outline-none'
            aria-label={`Editing ${editor.name}`}
          />
          <div className='flex items-center gap-5 bg-zinc-800 px-3 py-1 text-[12px] text-zinc-300'>
            <span>
              <b className='text-zinc-100'>^O</b> Write Out
            </span>
            <span>
              <b className='text-zinc-100'>^X</b> Exit
            </span>
            {editor.status && <span className='ml-auto text-emerald-400'>{editor.status}</span>}
          </div>
        </div>
      )}
    </button>
  );
}
