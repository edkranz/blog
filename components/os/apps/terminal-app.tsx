'use client';

import { profile, socials } from '@/lib/eddie';
import { useWindowStore } from '@/lib/os/store';
import type { AppId } from '@/lib/os/types';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppContentProps } from './types';

type Seg = { t: string; c?: string };
type Line = Seg[];

const PROMPT: Line = [
  { t: 'eddie@kranz.au', c: 'text-emerald-400' },
  { t: ':', c: 'text-zinc-500' },
  { t: '~', c: 'text-sky-400' },
  { t: '$ ', c: 'text-zinc-500' },
];

const out = (t: string, c = 'text-zinc-300'): Line => [{ t, c }];

const NEOFETCH: Line[] = [
  [{ t: '       ___          ', c: 'text-[var(--brand-red)]' }, { t: 'eddie', c: 'text-emerald-400' }, { t: '@', c: 'text-zinc-500' }, { t: 'kranz.au', c: 'text-sky-400' }],
  [{ t: '      (• ◡ •)         ', c: 'text-[var(--brand-red)]' }, { t: '----------------', c: 'text-zinc-600' }],
  [{ t: '      /|   |\\         ', c: 'text-[var(--brand-red)]' }, { t: 'OS', c: 'text-amber-300' }, { t: ': Eddie OS v1.0', c: 'text-zinc-300' }],
  [{ t: '       \\___/          ', c: 'text-[var(--brand-red)]' }, { t: 'Host', c: 'text-amber-300' }, { t: ': kranz.au', c: 'text-zinc-300' }],
  [{ t: '   ╔══════════════╗   ', c: 'text-fuchsia-400' }, { t: 'Kernel', c: 'text-amber-300' }, { t: ': React 19 + Next 16', c: 'text-zinc-300' }],
  [{ t: '   ║  E D D I E    ║   ', c: 'text-fuchsia-400' }, { t: 'Shell', c: 'text-amber-300' }, { t: ': eksh 1.0', c: 'text-zinc-300' }],
  [{ t: '   ║      O S      ║   ', c: 'text-fuchsia-400' }, { t: 'WM', c: 'text-amber-300' }, { t: ': zustand-wm', c: 'text-zinc-300' }],
  [{ t: '   ╚══════════════╝   ', c: 'text-fuchsia-400' }, { t: 'CPU', c: 'text-amber-300' }, { t: ': Caffeine ×8', c: 'text-zinc-300' }],
  [{ t: '                      ', c: 'text-fuchsia-400' }, { t: 'Memory', c: 'text-amber-300' }, { t: ': 42 half-baked ideas', c: 'text-zinc-300' }],
];

const MOTORBIKE: Line[] = [
  out('      __o', 'text-amber-300'),
  out('    _ \\<_   vroom vroom 🏍️', 'text-amber-300'),
  out('   (_)/(_)', 'text-amber-300'),
];

const FILES = ['about.txt', 'skills.txt', 'resume.txt', 'blog/', 'projects/', 'contact.txt', 'secrets/'];

export function TerminalApp({ win }: AppContentProps) {
  const openApp = useWindowStore((s) => s.openApp);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const { setTheme } = useTheme();
  const [lines, setLines] = useState<Line[]>(() => [
    [{ t: 'Eddie OS', c: 'text-[var(--brand-red)] font-bold' }, { t: ' — eksh 1.0', c: 'text-zinc-400' }],
    out("Type 'help' to get started, or 'neofetch' to show off.", 'text-zinc-500'),
    [],
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = useCallback((...newLines: Line[]) => setLines((prev) => [...prev, ...newLines]), []);

  const commands = useMemo(() => {
    const list: Record<string, () => Line[] | void> = {};

    const help = (): Line[] => [
      out('Available commands:', 'text-amber-300'),
      out('  help          show this message'),
      out('  whoami        who is this guy?'),
      out('  about         open the About app'),
      out('  ls            list files'),
      out('  cat <file>    read a file (try about.txt)'),
      out('  open <app>    launch an app (blog, projects, contact…)'),
      out('  neofetch      system info, with flair'),
      out('  socials       links to find me'),
      out('  theme <mode>  light | dark'),
      out('  clear         clear the screen'),
      out('  exit          close the terminal'),
      out('  …and a few hidden ones 🤫', 'text-zinc-500'),
    ];

    list.help = help;
    list.man = help;
    list['?'] = help;
    list.whoami = () => [out(`${profile.name} — ${profile.role} @ ${profile.company.name}. ${profile.location}.`)];
    list.ls = () => [FILES.join('   ')].map((t) => out(t, 'text-sky-300'));
    list.pwd = () => [out('/home/eddie')];
    list.date = () => [out(new Date().toString())];
    list.echo = () => [];
    list.neofetch = () => NEOFETCH;
    list.socials = () => [out('Find me online:', 'text-amber-300'), ...socials.map((s) => out(`  ${s.label.padEnd(10)} ${s.url}`, 'text-sky-300'))];
    list.links = list.socials;
    list.about = () => {
      openApp('about');
      return [out('Opening About…', 'text-emerald-400')];
    };
    list.blog = () => {
      openApp('blog');
      return [out('Opening Blog…', 'text-emerald-400')];
    };
    list.projects = () => {
      openApp('projects');
      return [out('Opening Projects…', 'text-emerald-400')];
    };
    list.contact = () => {
      openApp('contact');
      return [out('Opening Contact…', 'text-emerald-400')];
    };
    list.vroom = () => MOTORBIKE;
    list.motorbike = () => MOTORBIKE;
    list.sudo = () => [out("Nice try. You don't have permission to do that. 🙃", 'text-rose-400')];
    list.exit = () => {
      closeWindow(win.id);
    };
    list.logout = list.exit;

    return list;
  }, [openApp, closeWindow, win.id]);

  const run = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      push([...PROMPT, { t: raw, c: 'text-zinc-100' }]);
      if (!trimmed) {
        push([]);
        return;
      }
      const [cmd, ...args] = trimmed.split(/\s+/);
      const lower = cmd.toLowerCase();

      if (lower === 'clear') {
        setLines([]);
        return;
      }
      if (lower === 'echo') {
        push(out(args.join(' ')), []);
        return;
      }
      if (lower === 'theme') {
        const mode = args[0]?.toLowerCase();
        if (mode === 'light' || mode === 'dark') {
          setTheme(mode);
          push(out(`Theme set to ${mode}.`, 'text-emerald-400'), []);
        } else {
          push(out('usage: theme <light|dark>', 'text-rose-400'), []);
        }
        return;
      }
      if (lower === 'open') {
        const target = args[0]?.toLowerCase() as AppId | undefined;
        const valid: AppId[] = ['welcome', 'about', 'blog', 'projects', 'terminal', 'minesweeper', 'tetris', 'contact', 'settings', 'trash'];
        if (target && valid.includes(target)) {
          openApp(target);
          push(out(`Launching ${target}…`, 'text-emerald-400'), []);
        } else {
          push(out(`open: unknown app '${args[0] ?? ''}'. Try: blog, projects, about, minesweeper.`, 'text-rose-400'), []);
        }
        return;
      }
      if (lower === 'cat') {
        const file = args[0];
        const map: Record<string, Line[]> = {
          'about.txt': [out(profile.blurb)],
          'skills.txt': [out('.NET · TypeScript · React · Next.js · Python · Azure · Azure OpenAI · Docker')],
          'resume.txt': [out(`${profile.name} — ${profile.role} @ ${profile.company.name}`), out('B. Advanced Computing (Software Dev), University of Sydney'), out('Type "open about" for the full story.')],
          'contact.txt': [out(profile.email, 'text-sky-300')],
          'secrets/.env': [out('TINA_TOKEN=********  (nice try 😏)', 'text-rose-400')],
        };
        if (file && map[file]) push(...map[file], []);
        else push(out(`cat: ${file ?? ''}: No such file. Try 'ls'.`, 'text-rose-400'), []);
        return;
      }

      const fn = commands[lower];
      if (fn) {
        const res = fn();
        if (res) push(...res, []);
        else if (lower !== 'clear') push();
      } else {
        push(out(`eksh: command not found: ${cmd}. Type 'help'.`, 'text-rose-400'), []);
      }
    },
    [commands, push, openApp, setTheme],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      run(input);
      if (input.trim()) setHistory((h) => [...h, input]);
      setInput('');
      setHistIdx(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistory((h) => {
        if (h.length === 0) return h;
        const idx = histIdx === -1 ? h.length - 1 : Math.max(0, histIdx - 1);
        setHistIdx(idx);
        setInput(h[idx]);
        return h;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistory((h) => {
        if (histIdx === -1) return h;
        const idx = histIdx + 1;
        if (idx >= h.length) {
          setHistIdx(-1);
          setInput('');
        } else {
          setHistIdx(idx);
          setInput(h[idx]);
        }
        return h;
      });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const names = Object.keys(commands).concat('clear', 'echo', 'theme', 'open', 'cat');
      const match = names.find((n) => n.startsWith(input.toLowerCase()) && input);
      if (match) setInput(match);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => bottomRef.current?.scrollIntoView({ block: 'end' }), [lines]);

  return (
    <button
      type='button'
      tabIndex={-1}
      onClick={() => inputRef.current?.focus()}
      className='crt block h-full w-full cursor-text overflow-hidden bg-[#0c0d12] text-left font-mono text-[13px] leading-[1.5]'
    >
      <div className='os-scroll h-full overflow-y-auto p-3.5'>
        {lines.map((line, i) => (
          <div key={i} className='whitespace-pre-wrap break-words'>
            {line.length === 0 ? ' ' : line.map((seg, j) => (
              <span key={j} className={seg.c}>
                {seg.t}
              </span>
            ))}
          </div>
        ))}
        <div className='flex whitespace-pre-wrap'>
          {PROMPT.map((seg, j) => (
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
        <div ref={bottomRef} />
      </div>
    </button>
  );
}
