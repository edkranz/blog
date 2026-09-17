/**
 * Every eksh command. Each entry is self-describing (`usage` / `desc`), so `help`, `man`,
 * `which` and tab-completion all come from this one table. Keep commands pure over `Ctx`
 * — anything that touches the OS goes through `ctx.env.sys`.
 */

import { profile, socials } from '@/lib/eddie';
import { APP_META, DOCK_ORDER } from '@/lib/os/apps-meta';
import {
  HOME,
  type VDir,
  type VNode,
  absPath,
  displayPath,
  fsMkdir,
  fsMove,
  fsRemove,
  fsTouch,
  fsWrite,
  isEditable,
  listChildren,
  nodeAt,
  resolvePath,
} from '@/lib/os/filesystem';
import { useFsStore } from '@/lib/os/fs-store';
import { WALLPAPERS } from '@/lib/os/prefs';
import type { AppId } from '@/lib/os/types';
import { BARKS, COW, DOG, FORTUNES, MOTORBIKE, NEOFETCH, TRAIN, TUX, bubble } from './ascii';
import { colorFor, displayName, fileText, globToRegExp, human, sizeOf, splitLines, walk } from './fsx';
import { C, type Cmd, type CmdGroup, type Ctx, type Env, type Line, out } from './types';

const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const pidOf = (winId: string) => 1000 + Number(winId.slice(winId.lastIndexOf('-') + 1));
const APP_IDS = Object.keys(APP_META) as AppId[];

/** Run a script body line by line (echoing each line unless `quiet`). */
export function runScript(content: string, env: Env, quiet = false): void {
  if (env.depth > 8) {
    env.print(out('script: maximum recursion depth exceeded', C.err));
    env.state.lastStatus = 1;
    return;
  }
  const child: Env = { ...env, depth: env.depth + 1 };
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (!quiet)
      env.print([
        { t: '» ', c: C.dimmer },
        { t: line, c: C.dim },
      ]);
    env.exec(line, child);
  }
}

const node = (ctx: Ctx, p: string): VNode | null => nodeAt(ctx.env.getRoot(), resolvePath(ctx.cwd, p));

/** Apply a file-system mutation result to the live tree. */
const mutate = (ctx: Ctx, res: ReturnType<typeof fsMkdir>) => {
  if (res.ok) ctx.env.setRoot(res.root);
  else ctx.err(res.error);
};

const dateStamp = (d: Date) =>
  `${d.toLocaleDateString('en-AU', { month: 'short', day: '2-digit' })} ${d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
const boot = () => (typeof performance !== 'undefined' ? performance.timeOrigin : Date.now());

// ===========================================================================
// File system
// ===========================================================================

const fs: Cmd[] = [
  {
    name: 'ls',
    usage: 'ls [-la] [path…]',
    desc: 'list a directory',
    group: 'fs',
    aliases: ['dir'],
    run(ctx) {
      const targets = ctx.args.length ? ctx.args : ['.'];
      const long = ctx.flags.has('l');
      const all = ctx.flags.has('a');
      targets.forEach((t, i) => {
        const n = node(ctx, t);
        if (!n) return ctx.err(`ls: ${t}: No such file or directory`);
        if (n.type !== 'dir') return ctx.print([{ t: n.name, c: colorFor(n) }]);
        if (targets.length > 1) {
          if (i) ctx.print([]);
          ctx.print(out(`${t}:`, C.head));
        }
        const kids = listChildren(n, all);
        if (long) {
          for (const k of kids)
            ctx.print([
              { t: k.type === 'dir' ? 'drwxr-xr-x' : k.kind === 'app' ? '-rwxr-xr-x' : k.kind === 'link' ? 'lrwxrwxrwx' : '-rw-r--r--', c: C.dim },
              { t: `  ed  ${String(sizeOf(k)).padStart(7)}  ${dateStamp(new Date(boot()))}  `, c: C.dim },
              { t: displayName(k), c: colorFor(k) },
              ...(k.type === 'file' && k.kind === 'link' ? [{ t: ` -> ${k.href}`, c: C.dim }] : []),
            ]);
          return;
        }
        const rows: Line[] = [];
        for (let j = 0; j < kids.length; j += 3) rows.push(kids.slice(j, j + 3).map((k) => ({ t: displayName(k).padEnd(22), c: colorFor(k) })));
        ctx.print(...rows);
      });
    },
  },
  {
    name: 'cd',
    usage: 'cd [dir]',
    desc: 'change directory (cd - goes back)',
    group: 'fs',
    run(ctx) {
      const target = ctx.args[0] === '-' ? (ctx.env.state.vars.OLDPWD ?? '~') : (ctx.args[0] ?? '~');
      const parts = resolvePath(ctx.cwd, target);
      const n = nodeAt(ctx.root, parts);
      if (!n) return ctx.err(`cd: ${target}: No such file or directory`);
      if (n.type !== 'dir') return ctx.err(`cd: ${target}: Not a directory`);
      ctx.env.state.vars.OLDPWD = absPath(ctx.cwd);
      ctx.env.setCwd(parts);
    },
  },
  { name: 'pwd', usage: 'pwd', desc: 'print the working directory', group: 'fs', run: (ctx) => ctx.out(absPath(ctx.cwd)) },
  {
    name: 'cat',
    usage: 'cat <file…>',
    desc: 'print files (or stdin)',
    group: 'fs',
    aliases: ['less', 'more'],
    run(ctx) {
      if (ctx.args.length === 0 && ctx.stdin === null) return ctx.err('usage: cat <file>');
      for (const f of ctx.args) {
        const n = node(ctx, f);
        if (n?.type === 'file' && n.kind === 'app') return ctx.err(`cat: ${f}: Is an application`);
        if (n?.type === 'file' && n.kind === 'image') return ctx.err(`cat: ${f}: Is a binary file`);
      }
      const lines = ctx.readLines();
      if (lines) ctx.print(...lines.map((l) => out(l)));
    },
  },
  {
    name: 'tree',
    usage: 'tree [path]',
    desc: 'show a directory tree',
    group: 'fs',
    run(ctx) {
      const parts = resolvePath(ctx.cwd, ctx.args[0] ?? '.');
      const n = nodeAt(ctx.root, parts);
      if (!n || n.type !== 'dir') return ctx.err(`tree: ${ctx.args[0] ?? '.'}: Not a directory`);
      const lines: Line[] = [out(displayPath(parts), C.dir)];
      let dirs = 0;
      let files = 0;
      const rec = (d: VDir, prefix: string) => {
        const kids = listChildren(d, ctx.flags.has('a'));
        kids.forEach((k, i) => {
          const last = i === kids.length - 1;
          lines.push([
            { t: prefix + (last ? '└── ' : '├── '), c: C.dimmer },
            { t: displayName(k), c: colorFor(k) },
          ]);
          if (k.type === 'dir') {
            dirs++;
            rec(k, prefix + (last ? '    ' : '│   '));
          } else files++;
        });
      };
      rec(n, '');
      lines.push([], out(`${dirs} directories, ${files} files`, C.dim));
      ctx.print(...lines);
    },
  },
  {
    name: 'mkdir',
    usage: 'mkdir [-p] <dir…>',
    desc: 'make directories',
    group: 'fs',
    run(ctx) {
      if (!ctx.args.length) return ctx.err('usage: mkdir <dir>');
      for (const d of ctx.args) mutate(ctx, fsMkdir(ctx.env.getRoot(), ctx.cwd, d, ctx.flags.has('p')));
    },
  },
  {
    name: 'touch',
    usage: 'touch <file…>',
    desc: 'create empty files',
    group: 'fs',
    run(ctx) {
      if (!ctx.args.length) return ctx.err('usage: touch <file>');
      for (const f of ctx.args) mutate(ctx, fsTouch(ctx.env.getRoot(), ctx.cwd, f));
    },
  },
  {
    name: 'rm',
    usage: 'rm [-rf] <path…>',
    desc: 'remove files (and directories with -r)',
    group: 'fs',
    run(ctx) {
      if (!ctx.args.length) return ctx.err('usage: rm [-r] <file>');
      const recursive = ctx.flags.has('r') || ctx.flags.has('R') || ctx.flags.has('recursive');
      const force = ctx.flags.has('f') || ctx.flags.has('force');
      // The easter egg: nuking the root — `rm -rf /`, `rm -rf /*` (glob-expanded), or every top-level dir.
      const resolved = ctx.args.map((a) => resolvePath(ctx.cwd, a));
      const rootKids = new Set(ctx.root.children.map((c) => c.name));
      const topLevel = new Set(resolved.filter((p) => p.length === 1).map((p) => p[0]));
      const hitsRoot = resolved.some((p) => p.length === 0) || (rootKids.size > 0 && [...rootKids].every((k) => topLevel.has(k)));
      if (hitsRoot) {
        if (!recursive) return ctx.err('rm: /: is a directory');
        if (!force && !ctx.flags.has('no-preserve-root'))
          return ctx.err("rm: it is dangerous to operate recursively on '/'. rm: use --no-preserve-root (or -f) to override this failsafe");
        ctx.env.sys.meltdown('YOU_DELETED_EVERYTHING');
        return;
      }
      for (const a of ctx.args) {
        const parts = resolvePath(ctx.cwd, a);
        const res = fsRemove(ctx.env.getRoot(), ctx.cwd, a, recursive);
        if (!res.ok) {
          if (!force || !res.error.includes('No such')) ctx.err(res.error);
          continue;
        }
        ctx.env.setRoot(res.root);
      }
    },
  },
  {
    name: 'rmdir',
    usage: 'rmdir <dir…>',
    desc: 'remove empty directories',
    group: 'fs',
    run(ctx) {
      if (!ctx.args.length) return ctx.err('usage: rmdir <dir>');
      for (const d of ctx.args) mutate(ctx, fsRemove(ctx.env.getRoot(), ctx.cwd, d, false));
    },
  },
  {
    name: 'mv',
    usage: 'mv <src> <dst>',
    desc: 'move / rename',
    group: 'fs',
    run(ctx) {
      if (ctx.args.length < 2) return ctx.err('usage: mv <src> <dst>');
      const dst = ctx.args[ctx.args.length - 1];
      for (const src of ctx.args.slice(0, -1)) mutate(ctx, fsMove(ctx.env.getRoot(), ctx.cwd, src, dst, false));
    },
  },
  {
    name: 'cp',
    usage: 'cp [-r] <src> <dst>',
    desc: 'copy',
    group: 'fs',
    run(ctx) {
      if (ctx.args.length < 2) return ctx.err('usage: cp <src> <dst>');
      const dst = ctx.args[ctx.args.length - 1];
      for (const src of ctx.args.slice(0, -1)) {
        const n = node(ctx, src);
        if (n?.type === 'dir' && !ctx.flags.has('r') && !ctx.flags.has('R')) {
          ctx.err(`cp: -r not specified; omitting directory '${src}'`);
          continue;
        }
        mutate(ctx, fsMove(ctx.env.getRoot(), ctx.cwd, src, dst, true));
      }
    },
  },
  {
    name: 'nano',
    usage: 'nano <file>',
    desc: 'edit a file (^O save, ^X exit)',
    group: 'fs',
    aliases: ['vi', 'vim', 'edit', 'emacs', 'code'],
    run(ctx) {
      const f = ctx.args[0];
      if (!f) return ctx.err(`usage: ${ctx.name} <file>`);
      const parts = resolvePath(ctx.cwd, f);
      const n = nodeAt(ctx.root, parts);
      if (n) {
        if (n.type !== 'file') return ctx.err(`${f}: Is a directory`);
        if (!isEditable(n)) return ctx.err(`${f}: cannot edit this file`);
        return ctx.env.sys.openNano(parts.slice(0, -1), n.name, n.content ?? '');
      }
      const parent = nodeAt(ctx.root, parts.slice(0, -1));
      if (!parent || parent.type !== 'dir') return ctx.err(`${f}: No such file or directory`);
      ctx.env.sys.openNano(parts.slice(0, -1), parts[parts.length - 1], '');
    },
  },
  {
    name: 'head',
    usage: 'head [-n N] <file>',
    desc: 'first lines of a file',
    group: 'fs',
    valued: ['n'],
    run(ctx) {
      const lines = ctx.readLines();
      if (!lines) return ctx.err('usage: head [-n N] <file>');
      ctx.print(...lines.slice(0, Number(ctx.opts.n ?? 10) || 10).map((l) => out(l)));
    },
  },
  {
    name: 'tail',
    usage: 'tail [-n N] <file>',
    desc: 'last lines of a file',
    group: 'fs',
    valued: ['n'],
    run(ctx) {
      const lines = ctx.readLines();
      if (!lines) return ctx.err('usage: tail [-n N] <file>');
      ctx.print(...lines.slice(-(Number(ctx.opts.n ?? 10) || 10)).map((l) => out(l)));
    },
  },
  {
    name: 'wc',
    usage: 'wc [-lwc] <file…>',
    desc: 'count lines, words, chars',
    group: 'fs',
    run(ctx) {
      const count = (lines: string[], label: string) => {
        const text = lines.join('\n');
        const l = lines.length;
        const w = text.split(/\s+/).filter(Boolean).length;
        const c = text.length + (lines.length ? 1 : 0);
        const cols: string[] = [];
        const any = ctx.flags.has('l') || ctx.flags.has('w') || ctx.flags.has('c');
        if (!any || ctx.flags.has('l')) cols.push(String(l).padStart(7));
        if (!any || ctx.flags.has('w')) cols.push(String(w).padStart(7));
        if (!any || ctx.flags.has('c')) cols.push(String(c).padStart(7));
        ctx.print([
          { t: cols.join(''), c: C.text },
          { t: label ? ` ${label}` : '', c: C.dim },
        ]);
        return [l, w, c];
      };
      if (ctx.args.length === 0) {
        const lines = ctx.readLines();
        if (!lines) return ctx.err('usage: wc <file>');
        count(lines, '');
        return;
      }
      let ok = true;
      for (const f of ctx.args) {
        const lines = ctx.readLines([f]);
        if (!lines) {
          ok = false;
          continue;
        }
        count(lines, f);
      }
      if (ok && ctx.args.length > 1) count(ctx.readLines() ?? [], 'total');
    },
  },
  {
    name: 'grep',
    usage: 'grep [-inrv] <pattern> [file…]',
    desc: 'search for a pattern',
    group: 'fs',
    run(ctx) {
      const [pat, ...files] = ctx.args;
      if (!pat) return ctx.err('usage: grep [-inrv] <pattern> [file]');
      let re: RegExp;
      try {
        re = new RegExp(pat, ctx.flags.has('i') ? 'gi' : 'g');
      } catch {
        return ctx.err(`grep: invalid pattern: ${pat}`);
      }
      const invert = ctx.flags.has('v');
      const sources: { label: string; lines: string[] }[] = [];
      if (ctx.flags.has('r') || ctx.flags.has('R')) {
        for (const f of files.length ? files : ['.']) {
          const n = node(ctx, f);
          if (!n) return ctx.err(`grep: ${f}: No such file or directory`);
          if (n.type === 'dir') {
            for (const { node: k, parts } of walk(n, []))
              if (k.type === 'file' && isEditable(k))
                sources.push({ label: `${f === '.' ? '' : `${f.replace(/\/$/, '')}/`}${parts.join('/')}`, lines: splitLines(k.content ?? '') });
          } else sources.push({ label: f, lines: splitLines(fileText(n)) });
        }
      } else if (files.length) {
        for (const f of files) {
          const lines = ctx.readLines([f]);
          if (!lines) return;
          sources.push({ label: f, lines });
        }
      } else {
        const lines = ctx.readLines([]); // stdin only — the first arg is the pattern, not a file
        if (!lines) return ctx.err('usage: grep [-inrv] <pattern> [file]');
        sources.push({ label: '', lines });
      }
      const showFile = sources.length > 1 || ctx.flags.has('r');
      let hits = 0;
      for (const s of sources)
        s.lines.forEach((line, i) => {
          re.lastIndex = 0;
          const matched = re.test(line);
          if (matched === invert) return;
          hits++;
          if (ctx.flags.has('c')) return;
          const segs: Line = [];
          if (showFile) segs.push({ t: s.label, c: C.image }, { t: ':', c: C.dim });
          if (ctx.flags.has('n')) segs.push({ t: String(i + 1), c: C.ok }, { t: ':', c: C.dim });
          if (invert) segs.push({ t: line, c: C.text });
          else {
            let last = 0;
            re.lastIndex = 0;
            for (const m of line.matchAll(re)) {
              if (m[0] === '') break;
              segs.push({ t: line.slice(last, m.index), c: C.text }, { t: m[0], c: 'text-rose-300 font-bold' });
              last = (m.index ?? 0) + m[0].length;
            }
            segs.push({ t: line.slice(last), c: C.text });
          }
          ctx.print(segs);
        });
      if (ctx.flags.has('c')) ctx.out(String(hits));
      if (hits === 0) ctx.env.state.lastStatus = 1;
    },
  },
  {
    name: 'find',
    usage: 'find [path] [-name pat] [-type f|d]',
    desc: 'find files by name / type',
    group: 'fs',
    valued: ['name', 'iname', 'type'],
    run(ctx) {
      const start = ctx.args[0] ?? '.';
      const n = node(ctx, start);
      if (!n) return ctx.err(`find: ${start}: No such file or directory`);
      const pat = ctx.opts.name ?? ctx.opts.iname;
      const re = pat ? globToRegExp(pat) : null;
      const ci = ctx.opts.iname !== undefined;
      const type = ctx.opts.type;
      const base = start.replace(/\/+$/, '');
      const matches = (k: VNode) => (!re || re.test(ci ? k.name.toLowerCase() : k.name)) && (!type || (type === 'd' ? k.type === 'dir' : k.type === 'file'));
      if (matches(n)) ctx.print([{ t: base, c: colorFor(n) }]);
      if (n.type !== 'dir') return;
      for (const { node: k, parts } of walk(n, [])) if (matches(k)) ctx.print([{ t: `${base}/${parts.join('/')}`, c: colorFor(k) }]);
    },
  },
  {
    name: 'stat',
    usage: 'stat <path>',
    desc: 'file details',
    group: 'fs',
    run(ctx) {
      const f = ctx.args[0];
      if (!f) return ctx.err('usage: stat <path>');
      const parts = resolvePath(ctx.cwd, f);
      const n = nodeAt(ctx.root, parts);
      if (!n) return ctx.err(`stat: ${f}: No such file or directory`);
      const kind = n.type === 'dir' ? 'directory' : n.kind === 'link' ? 'symbolic link' : n.kind === 'app' ? 'application' : 'regular file';
      const mode = n.type === 'dir' ? '0755/drwxr-xr-x' : n.kind === 'app' ? '0755/-rwxr-xr-x' : '0644/-rw-r--r--';
      ctx.print(
        [
          { t: '  File: ', c: C.dim },
          { t: n.name, c: colorFor(n) },
        ],
        [
          { t: '  Path: ', c: C.dim },
          { t: absPath(parts), c: C.text },
        ],
        [
          { t: '  Size: ', c: C.dim },
          { t: `${sizeOf(n)}`.padEnd(10), c: C.text },
          { t: 'Kind: ', c: C.dim },
          { t: (n.type === 'dir' ? 'dir' : n.kind).padEnd(10), c: C.text },
          { t: 'Type: ', c: C.dim },
          { t: kind, c: C.text },
        ],
        [
          { t: 'Access: ', c: C.dim },
          { t: `(${mode})  Uid: (1000/ed)  Gid: (1000/ed)`, c: C.text },
        ],
        [
          { t: 'Modify: ', c: C.dim },
          { t: new Date(boot()).toString(), c: C.text },
        ],
        ...(n.info
          ? [
              [
                { t: '  Info: ', c: C.dim },
                { t: n.info, c: C.text },
              ],
            ]
          : [])
      );
    },
  },
  {
    name: 'file',
    usage: 'file <path…>',
    desc: 'guess a file type',
    group: 'fs',
    run(ctx) {
      if (!ctx.args.length) return ctx.err('usage: file <path>');
      for (const f of ctx.args) {
        const n = node(ctx, f);
        if (!n) {
          ctx.err(`${f}: cannot open (No such file or directory)`);
          continue;
        }
        const desc =
          n.type === 'dir'
            ? 'directory'
            : n.kind === 'markdown'
              ? 'Markdown document, UTF-8 Unicode text'
              : n.kind === 'image'
                ? 'PNG image data, 256 x 256, 8-bit/color RGBA'
                : n.kind === 'link'
                  ? `symbolic link to ${n.href}`
                  : n.kind === 'app'
                    ? `Eddie OS application bundle (${n.app})`
                    : n.content?.startsWith('#!')
                      ? `${n.content.split('\n')[0].slice(2)} script, ASCII text executable`
                      : n.content === ''
                        ? 'empty'
                        : 'ASCII text';
        ctx.print([
          { t: `${f}: `, c: colorFor(n) },
          { t: desc, c: C.text },
        ]);
      }
    },
  },
  {
    name: 'du',
    usage: 'du [-sh] [path]',
    desc: 'disk usage',
    group: 'fs',
    run(ctx) {
      const start = ctx.args[0] ?? '.';
      const n = node(ctx, start);
      if (!n) return ctx.err(`du: ${start}: No such file or directory`);
      const fmt = (b: number) => (ctx.flags.has('h') ? human(b) : String(Math.ceil(b / 512)));
      if (!ctx.flags.has('s') && n.type === 'dir')
        for (const { node: k, parts } of walk(n, []))
          if (k.type === 'dir')
            ctx.print([
              { t: fmt(sizeOf(k)).padStart(8), c: C.text },
              { t: `  ${start.replace(/\/$/, '')}/${parts.join('/')}`, c: C.dir },
            ]);
      ctx.print([
        { t: fmt(sizeOf(n)).padStart(8), c: C.text },
        { t: `  ${start}`, c: colorFor(n) },
      ]);
    },
  },
  {
    name: 'df',
    usage: 'df [-h]',
    desc: 'free disk space',
    group: 'fs',
    run(ctx) {
      const used = sizeOf(ctx.root);
      const quota = 5 * 1024 * 1024;
      const row = (fsn: string, size: string, u: string, avail: string, pct: string, mount: string): Line => [
        { t: fsn.padEnd(16), c: C.text },
        { t: `${size.padStart(6)} ${u.padStart(6)} ${avail.padStart(6)} ${pct.padStart(5)}  `, c: C.text },
        { t: mount, c: C.dir },
      ];
      ctx.print(
        [{ t: `${'Filesystem'.padEnd(16)}${'Size'.padStart(6)} ${'Used'.padStart(6)} ${'Avail'.padStart(6)} ${'Use%'.padStart(5)}  Mounted on`, c: C.dim }],
        row('/dev/eddie1', '64G', '42G', '22G', '66%', '/'),
        row('localStorage', human(quota), human(used), human(quota - used), `${Math.max(1, Math.round((used / quota) * 100))}%`, '/home/ed'),
        row('tmpfs', '16G', '0', '16G', '0%', '/dev/shm'),
        row('coffee', '1L', '0.9L', '0.1L', '90%', '/dev/brain'),
        row('zeppelin', '∞', '∞', '∞', '100%', '/dev/goodboy')
      );
    },
  },
  {
    name: 'diff',
    usage: 'diff <a> <b>',
    desc: 'compare two files',
    group: 'fs',
    run(ctx) {
      if (ctx.args.length < 2) return ctx.err('usage: diff <a> <b>');
      const a = ctx.readLines([ctx.args[0]]);
      const b = ctx.readLines([ctx.args[1]]);
      if (!a || !b) return;
      // Plain LCS — the files are tiny.
      const n = a.length;
      const m = b.length;
      const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      const outp: Line[] = [];
      let i = 0;
      let j = 0;
      let changes = 0;
      while (i < n || j < m) {
        if (i < n && j < m && a[i] === b[j]) {
          outp.push(out(`  ${a[i]}`, C.dim));
          i++;
          j++;
        } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
          outp.push(out(`+ ${b[j++]}`, C.ok));
          changes++;
        } else {
          outp.push(out(`- ${a[i++]}`, C.err));
          changes++;
        }
      }
      if (changes === 0) return ctx.out(`${ctx.args[0]} and ${ctx.args[1]} are identical`, C.dim);
      ctx.print(out(`--- ${ctx.args[0]}`, C.err), out(`+++ ${ctx.args[1]}`, C.ok), ...outp);
      ctx.env.state.lastStatus = 1;
    },
  },
  {
    name: 'basename',
    usage: 'basename <path>',
    desc: 'strip the directory from a path',
    group: 'fs',
    run: (ctx) => (ctx.args[0] ? ctx.out(ctx.args[0].replace(/\/+$/, '').split('/').pop() ?? '') : ctx.err('usage: basename <path>')),
  },
  {
    name: 'dirname',
    usage: 'dirname <path>',
    desc: 'strip the file from a path',
    group: 'fs',
    run(ctx) {
      if (!ctx.args[0]) return ctx.err('usage: dirname <path>');
      const p = ctx.args[0].replace(/\/+$/, '');
      const cut = p.lastIndexOf('/');
      ctx.out(cut < 0 ? '.' : cut === 0 ? '/' : p.slice(0, cut));
    },
  },
  { name: 'realpath', usage: 'realpath <path>', desc: 'absolute path', group: 'fs', run: (ctx) => ctx.out(absPath(resolvePath(ctx.cwd, ctx.args[0] ?? '.'))) },
  {
    name: 'chmod',
    usage: 'chmod <mode> <file>',
    desc: 'change permissions (spoiler: no)',
    group: 'fs',
    hidden: true,
    run: (ctx) => ctx.out(`chmod: changing permissions of '${ctx.args[1] ?? '?'}': Operation not permitted (everything here is already yours)`, C.head),
  },
  {
    name: 'chown',
    usage: 'chown',
    desc: '',
    group: 'fs',
    hidden: true,
    run: (ctx) => ctx.out("chown: it's all owned by ed, and ed is you today. Nothing to change.", C.head),
  },
  { name: 'ln', usage: 'ln', desc: '', group: 'fs', hidden: true, run: (ctx) => ctx.err('ln: symbolic links are a nice idea. Try cp instead.') },
  {
    name: 'open',
    usage: 'open <app|file|dir|url>',
    desc: 'open an app, file, folder or URL',
    group: 'fs',
    aliases: ['xdg-open', 'start'],
    run(ctx) {
      const target = ctx.args[0];
      if (!target) return ctx.err('usage: open <app|file|dir|url>');
      if (/^https?:\/\//.test(target)) {
        window.open(target, '_blank', 'noopener,noreferrer');
        return ctx.out(`Opening ${target}…`, C.ok);
      }
      const parts = resolvePath(ctx.cwd, target);
      const n = nodeAt(ctx.root, parts);
      const { sys } = ctx.env;
      if (n) {
        if (n.type === 'dir') {
          sys.openApp('files', { props: { path: parts }, title: 'Files' });
          return ctx.out(`Opening ${displayPath(parts)} in Files…`, C.ok);
        }
        if (n.kind === 'app' && n.app) {
          sys.openApp(n.app);
          return ctx.out(`Launching ${n.app}…`, C.ok);
        }
        if (n.kind === 'link' && n.href) {
          window.open(n.href, '_blank', 'noopener,noreferrer');
          return ctx.out(`Opening ${n.href}…`, C.ok);
        }
        sys.openApp('files', { props: { path: parts.slice(0, -1) }, title: 'Files' });
        return ctx.out(`Revealing ${n.name} in Files…`, C.ok);
      }
      const appName = target.toLowerCase() as AppId;
      if (APP_IDS.includes(appName)) {
        sys.openApp(appName);
        return ctx.out(`Launching ${appName}…`, C.ok);
      }
      ctx.err(`open: cannot open '${target}'. Try a file, folder, app name or URL.`);
    },
  },
  {
    name: 'files',
    usage: 'files',
    desc: 'open the current directory in Files',
    group: 'fs',
    aliases: ['finder', 'explorer'],
    run(ctx) {
      ctx.env.sys.openApp('files', { props: { path: ctx.cwd }, title: 'Files' });
      ctx.out('Opening Files…', C.ok);
    },
  },
  {
    name: 'reset',
    usage: 'reset',
    desc: 'factory-reset the file system',
    group: 'fs',
    run(ctx) {
      useFsStore.getState().reset();
      ctx.env.setRoot(useFsStore.getState().root);
      ctx.env.setCwd(HOME);
      ctx.out('File system restored to factory settings.', C.ok);
    },
  },
];

// ===========================================================================
// Text utilities (mostly used at the end of a pipe)
// ===========================================================================

const text: Cmd[] = [
  { name: 'echo', usage: 'echo <text>', desc: 'print text ($VARS expand)', group: 'text', run: (ctx) => ctx.out(ctx.args.join(' ')) },
  {
    name: 'printf',
    usage: 'printf <fmt> [args]',
    desc: 'formatted print (%s %d \\n)',
    group: 'text',
    hidden: true,
    run(ctx) {
      const [fmt = '', ...rest] = ctx.raw;
      let i = 0;
      const s = fmt
        .replace(/%[sd]/g, () => rest[i++] ?? '')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');
      ctx.print(...splitLines(s).map((l) => out(l)));
    },
  },
  {
    name: 'sort',
    usage: 'sort [-rnu] [file]',
    desc: 'sort lines',
    group: 'text',
    run(ctx) {
      const lines = ctx.readLines();
      if (!lines) return ctx.err('usage: sort [-rnu] <file>');
      let res = [...lines].sort(ctx.flags.has('n') ? (a, b) => Number.parseFloat(a) - Number.parseFloat(b) : (a, b) => a.localeCompare(b));
      if (ctx.flags.has('r')) res.reverse();
      if (ctx.flags.has('u')) res = res.filter((l, i) => i === 0 || l !== res[i - 1]);
      ctx.print(...res.map((l) => out(l)));
    },
  },
  {
    name: 'uniq',
    usage: 'uniq [-c] [file]',
    desc: 'collapse repeated adjacent lines',
    group: 'text',
    run(ctx) {
      const lines = ctx.readLines();
      if (!lines) return ctx.err('usage: uniq [-c] <file>');
      const groups: { l: string; n: number }[] = [];
      for (const l of lines) {
        const last = groups[groups.length - 1];
        if (last && last.l === l) last.n++;
        else groups.push({ l, n: 1 });
      }
      ctx.print(
        ...groups.map((g) =>
          ctx.flags.has('c')
            ? [
                { t: String(g.n).padStart(7), c: C.dim },
                { t: ` ${g.l}`, c: C.text },
              ]
            : out(g.l)
        )
      );
    },
  },
  {
    name: 'rev',
    usage: 'rev [file]',
    desc: 'reverse each line',
    group: 'text',
    run(ctx) {
      const lines = ctx.readLines();
      if (!lines) return ctx.err('usage: rev <file>');
      ctx.print(...lines.map((l) => out([...l].reverse().join(''))));
    },
  },
  {
    name: 'tac',
    usage: 'tac [file]',
    desc: 'cat, backwards',
    group: 'text',
    run(ctx) {
      const lines = ctx.readLines();
      if (!lines) return ctx.err('usage: tac <file>');
      ctx.print(...lines.reverse().map((l) => out(l)));
    },
  },
  {
    name: 'nl',
    usage: 'nl [file]',
    desc: 'number lines',
    group: 'text',
    run(ctx) {
      const lines = ctx.readLines();
      if (!lines) return ctx.err('usage: nl <file>');
      ctx.print(
        ...lines.map((l, i) => [
          { t: String(i + 1).padStart(6), c: C.dim },
          { t: `  ${l}`, c: C.text },
        ])
      );
    },
  },
  {
    name: 'tr',
    usage: 'tr [-d] <from> [to]',
    desc: 'translate characters (a-z A-Z)',
    group: 'text',
    run(ctx) {
      const expand = (s: string) =>
        s.replace(/(.)-(.)/g, (_, a: string, b: string) =>
          Array.from({ length: b.charCodeAt(0) - a.charCodeAt(0) + 1 }, (__, i) => String.fromCharCode(a.charCodeAt(0) + i)).join('')
        );
      const lines = ctx.stdin !== null ? splitLines(ctx.stdin) : null;
      if (!lines || !ctx.args[0]) return ctx.err('usage: <cmd> | tr <from> <to>');
      const from = expand(ctx.args[0]);
      const to = expand(ctx.args[1] ?? '');
      const map = (ch: string) => {
        const i = from.indexOf(ch);
        if (i < 0) return ch;
        if (ctx.flags.has('d')) return '';
        return to[Math.min(i, to.length - 1)] ?? ch;
      };
      ctx.print(...lines.map((l) => out([...l].map(map).join(''))));
    },
  },
  {
    name: 'cut',
    usage: 'cut -d <delim> -f <n> [file]',
    desc: 'select fields',
    group: 'text',
    valued: ['d', 'f'],
    run(ctx) {
      const lines = ctx.readLines();
      if (!lines || !ctx.opts.f) return ctx.err('usage: cut -d <delim> -f <n>');
      const delim = ctx.opts.d ?? '\t';
      const wanted = ctx.opts.f.split(',').flatMap((r) => {
        const m = /^(\d+)?-(\d+)?$/.exec(r);
        if (!m) return [Number(r)];
        const a = Number(m[1] ?? 1);
        const b = Number(m[2] ?? 99);
        return Array.from({ length: b - a + 1 }, (_, i) => a + i);
      });
      ctx.print(
        ...lines.map((l) =>
          out(
            wanted
              .map((i) => l.split(delim)[i - 1])
              .filter((f) => f !== undefined)
              .join(delim)
          )
        )
      );
    },
  },
  {
    name: 'xargs',
    usage: '… | xargs <cmd>',
    desc: 'run a command with stdin as arguments',
    group: 'text',
    run(ctx) {
      const items = (ctx.stdin ?? '').split(/\s+/).filter(Boolean);
      const cmd = ctx.raw.length ? ctx.raw : ['echo'];
      const quote = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;
      ctx.env.exec([...cmd, ...items].map(quote).join(' '), { ...ctx.env, stdin: null, depth: ctx.env.depth + 1 });
    },
  },
  {
    name: 'tee',
    usage: '… | tee <file>',
    desc: 'write stdin to a file and pass it on',
    group: 'text',
    run(ctx) {
      const lines = ctx.stdin !== null ? splitLines(ctx.stdin) : [];
      if (ctx.args[0]) mutate(ctx, fsWrite(ctx.env.getRoot(), ctx.cwd, ctx.args[0], lines.length ? `${lines.join('\n')}\n` : '', ctx.flags.has('a')));
      ctx.print(...lines.map((l) => out(l)));
    },
  },
  {
    name: 'yes',
    usage: 'yes [text]',
    desc: 'repeat forever (well…)',
    group: 'text',
    run(ctx) {
      const t = ctx.args.join(' ') || 'y';
      ctx.print(...Array.from({ length: 24 }, () => out(t)), out('^C  (okay, that is enough of that)', C.dim));
    },
  },
  {
    name: 'seq',
    usage: 'seq [first] [step] <last>',
    desc: 'print a sequence of numbers',
    group: 'text',
    run(ctx) {
      const n = ctx.args.map(Number);
      if (!n.length || n.some(Number.isNaN)) return ctx.err('usage: seq [first [step]] last');
      const [first, step, last] = n.length === 1 ? [1, 1, n[0]] : n.length === 2 ? [n[0], 1, n[1]] : n;
      if (step === 0) return ctx.err('seq: zero increment');
      const res: Line[] = [];
      for (let i = first; step > 0 ? i <= last : i >= last; i += step) {
        res.push(out(String(i)));
        if (res.length >= 500) break;
      }
      ctx.print(...res);
    },
  },
];

// ===========================================================================
// Shell built-ins
// ===========================================================================

const GROUP_LABEL: Record<CmdGroup, string> = { fs: 'File system', text: 'Text (pipe-friendly)', shell: 'Shell', system: 'System', fun: 'Fun' };

const shell: Cmd[] = [
  {
    name: 'help',
    usage: 'help [command]',
    desc: 'this list · man <cmd> for one command',
    group: 'shell',
    aliases: ['?', 'commands'],
    run(ctx) {
      if (ctx.args[0]) return findCommand('man')?.run(ctx);
      const groups: CmdGroup[] = ['fs', 'text', 'shell', 'system', 'fun'];
      for (const g of groups) {
        const cmds = COMMANDS.filter((c) => c.group === g && !c.hidden);
        ctx.print(
          out(GROUP_LABEL[g], C.head),
          ...cmds.map(
            (c) =>
              [
                { t: `  ${c.usage.padEnd(32)}`, c: C.bright },
                { t: c.desc, c: C.dim },
              ] as Line
          )
        );
      }
      return;
    },
  },
  {
    name: 'man',
    usage: 'man <command>',
    desc: 'manual page for a command',
    group: 'shell',
    run(ctx) {
      const name = ctx.args[0];
      if (!name) return ctx.err('What manual page do you want?  e.g. man grep');
      const c = findCommand(name.toLowerCase());
      if (!c) return ctx.err(`No manual entry for ${name}`);
      ctx.print(
        [
          { t: `${c.name.toUpperCase()}(1)`.padEnd(40), c: C.dim },
          { t: 'Eddie OS Manual', c: C.dim },
        ],
        [],
        out('NAME', C.head),
        out(`       ${c.name} - ${c.desc || 'no description'}`),
        [],
        out('SYNOPSIS', C.head),
        out(`       ${c.usage}`, C.bright),
        ...(c.aliases?.length ? [[], out('ALIASES', C.head), out(`       ${c.aliases.join(', ')}`)] : [])
      );
    },
  },
  {
    name: 'alias',
    usage: "alias [name='cmd']",
    desc: 'list or define aliases',
    group: 'shell',
    run(ctx) {
      const { aliases } = ctx.env.state;
      if (!ctx.raw.length) {
        const names = Object.keys(aliases).sort();
        if (!names.length) return;
        return ctx.print(
          ...names.map((n) => [
            { t: `alias ${n}=`, c: C.text },
            { t: `'${aliases[n]}'`, c: C.head },
          ])
        );
      }
      for (const a of ctx.raw) {
        const eq = a.indexOf('=');
        if (eq < 0) {
          if (aliases[a] === undefined) ctx.err(`alias: ${a}: not found`);
          else
            ctx.print([
              { t: `alias ${a}=`, c: C.text },
              { t: `'${aliases[a]}'`, c: C.head },
            ]);
          continue;
        }
        aliases[a.slice(0, eq)] = a.slice(eq + 1);
      }
    },
  },
  {
    name: 'unalias',
    usage: 'unalias <name>',
    desc: 'remove an alias',
    group: 'shell',
    run(ctx) {
      for (const a of ctx.args) if (!(a in ctx.env.state.aliases)) ctx.err(`unalias: ${a}: not found`);
      for (const a of ctx.args) delete ctx.env.state.aliases[a];
    },
  },
  {
    name: 'export',
    usage: 'export NAME=value',
    desc: 'set an environment variable',
    group: 'shell',
    run(ctx) {
      if (!ctx.raw.length) return findCommand('env')?.run(ctx);
      for (const a of ctx.raw) {
        const eq = a.indexOf('=');
        if (eq < 0) continue;
        ctx.env.state.vars[a.slice(0, eq)] = a.slice(eq + 1);
      }
    },
  },
  {
    name: 'env',
    usage: 'env',
    desc: 'print environment variables',
    group: 'shell',
    aliases: ['printenv', 'set'],
    run(ctx) {
      const { vars } = ctx.env.state;
      const show = ctx.args[0] ? [ctx.args[0]] : Object.keys({ ...vars, PWD: '' }).sort();
      for (const k of show)
        ctx.print([
          { t: `${k}=`, c: C.head },
          { t: k === 'PWD' ? absPath(ctx.cwd) : (vars[k] ?? ''), c: C.text },
        ]);
    },
  },
  {
    name: 'unset',
    usage: 'unset NAME',
    desc: 'remove a variable',
    group: 'shell',
    run(ctx) {
      for (const a of ctx.args) delete ctx.env.state.vars[a];
    },
  },
  {
    name: 'history',
    usage: 'history [-c]',
    desc: 'command history (!! and !n re-run)',
    group: 'shell',
    run(ctx) {
      if (ctx.flags.has('c')) {
        ctx.env.state.history.length = 0;
        return;
      }
      ctx.print(
        ...ctx.env.state.history.map((h, i) => [
          { t: String(i + 1).padStart(5), c: C.dim },
          { t: `  ${h}`, c: C.text },
        ])
      );
    },
  },
  {
    name: 'which',
    usage: 'which <command>',
    desc: 'locate a command',
    group: 'shell',
    aliases: ['type', 'whereis', 'command'],
    run(ctx) {
      if (!ctx.args.length) return ctx.err(`usage: ${ctx.name} <command>`);
      for (const a of ctx.args) {
        if (ctx.env.state.aliases[a] !== undefined) ctx.out(`${a}: aliased to '${ctx.env.state.aliases[a]}'`, C.head);
        else if (findCommand(a.toLowerCase())) ctx.out(`/usr/bin/${a}`);
        else ctx.err(`${a} not found`);
      }
    },
  },
  {
    name: 'sh',
    usage: 'sh <script> · ./script',
    desc: 'run a shell script',
    group: 'shell',
    aliases: ['bash', 'zsh', 'source', '.', 'exec'],
    run(ctx) {
      const f = ctx.args[0];
      if (!f) return ctx.err(`usage: ${ctx.name} <script>`);
      const n = node(ctx, f);
      if (!n || n.type !== 'file') return ctx.err(`${ctx.name}: ${f}: No such file`);
      if (!isEditable(n)) return ctx.err(`${ctx.name}: ${f}: not a script`);
      runScript(n.content ?? '', ctx.env, ctx.flags.has('q'));
    },
  },
  { name: 'clear', usage: 'clear', desc: 'clear the screen (also ^L)', group: 'shell', aliases: ['cls'], run: (ctx) => ctx.env.sys.clear() },
  {
    name: 'exit',
    usage: 'exit',
    desc: 'close the terminal',
    group: 'shell',
    aliases: ['logout', 'quit', ':q', ':q!', ':wq'],
    run: (ctx) => ctx.env.sys.exit(),
  },
  { name: 'true', usage: 'true', desc: 'succeed', group: 'shell', hidden: true, run: () => {} },
  { name: 'false', usage: 'false', desc: 'fail', group: 'shell', hidden: true, run: (ctx) => void (ctx.env.state.lastStatus = 1) },
  { name: 'sleep', usage: 'sleep <n>', desc: 'do nothing, briefly', group: 'shell', hidden: true, run: () => {} },
  { name: 'date', usage: 'date', desc: 'current date and time', group: 'shell', run: (ctx) => ctx.out(new Date().toString()) },
  {
    name: 'cal',
    usage: 'cal',
    desc: 'this month',
    group: 'shell',
    run(ctx) {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const title = now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      ctx.print(out(title.padStart(Math.floor((20 + title.length) / 2)).padEnd(20), C.head), out('Su Mo Tu We Th Fr Sa', C.dim));
      const first = new Date(y, m, 1).getDay();
      const days = new Date(y, m + 1, 0).getDate();
      let row: Line = [{ t: '   '.repeat(first), c: C.text }];
      for (let d = 1; d <= days; d++) {
        row.push({ t: String(d).padStart(2), c: d === now.getDate() ? 'bg-emerald-400 text-zinc-900 font-bold' : C.text }, { t: ' ', c: C.text });
        if ((first + d) % 7 === 0 || d === days) {
          ctx.print(row);
          row = [];
        }
      }
    },
  },
];

// ===========================================================================
// System / window manager
// ===========================================================================

const system: Cmd[] = [
  {
    name: 'whoami',
    usage: 'whoami',
    desc: 'who is this guy?',
    group: 'system',
    run: (ctx) => ctx.out('ed'),
  },
  { name: 'hostname', usage: 'hostname', desc: 'the machine name', group: 'system', run: (ctx) => ctx.out('kranz.au') },
  {
    name: 'uname',
    usage: 'uname [-a]',
    desc: 'system information',
    group: 'system',
    run: (ctx) =>
      ctx.out(ctx.flags.has('a') ? `EddieOS kranz.au 1.0.0-react19 #1 SMP ${new Date(boot()).toDateString()} wasm64 browser/js EddieOS` : 'EddieOS'),
  },
  {
    name: 'uptime',
    usage: 'uptime',
    desc: 'how long the OS has been up',
    group: 'system',
    run(ctx) {
      const s = Math.floor((Date.now() - boot()) / 1000);
      const up =
        s < 60 ? `${s} sec` : s < 3600 ? `${Math.floor(s / 60)} min` : `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
      const users = ctx.env.sys.windows().length;
      ctx.out(
        ` ${new Date().toLocaleTimeString('en-AU', { hour12: false })}  up ${up},  ${users} window${users === 1 ? '' : 's'},  load average: 0.42, 0.07, 0.01`
      );
    },
  },
  {
    name: 'neofetch',
    usage: 'neofetch',
    desc: 'system info, with flair',
    group: 'system',
    aliases: ['fastfetch', 'screenfetch'],
    run: (ctx) => ctx.print(...NEOFETCH),
  },
  {
    name: 'ps',
    usage: 'ps · top',
    desc: 'list windows as processes',
    group: 'system',
    aliases: ['top', 'htop', 'windows', 'jobs'],
    run(ctx) {
      const wins = [...ctx.env.sys.windows()].sort((a, b) => pidOf(a.id) - pidOf(b.id));
      if (ctx.name === 'top') {
        const cmd = findCommand('uptime');
        cmd?.run(ctx);
        ctx.out(`Tasks: ${wins.length} total, ${wins.filter((w) => !w.minimized).length} running, ${wins.filter((w) => w.minimized).length} sleeping`, C.dim);
        ctx.out('MiB Mem: 16384.0 total,  ∞ free,  42.0 used,  1.0 buff/cache (it is a browser tab)', C.dim);
        ctx.print([]);
      }
      ctx.print([{ t: `${'PID'.padStart(6)}  STAT  ${'APP'.padEnd(12)} ${'SIZE'.padEnd(10)} TITLE`, c: C.dim }]);
      for (const w of wins)
        ctx.print([
          { t: String(pidOf(w.id)).padStart(6), c: C.text },
          { t: `  ${w.minimized ? 'S' : w.id === ctx.env.sys.selfId ? 'R+' : 'R'}`.padEnd(8), c: w.minimized ? C.dim : C.ok },
          { t: w.appId.padEnd(12), c: C.app },
          { t: `${w.rect.w}x${w.rect.h}`.padEnd(11), c: C.dim },
          { t: w.title, c: C.text },
        ]);
    },
  },
  {
    name: 'kill',
    usage: 'kill <pid>',
    desc: 'close a window by PID',
    group: 'system',
    run(ctx) {
      if (!ctx.args.length) return ctx.err('usage: kill <pid>');
      for (const a of ctx.args) {
        const w = ctx.env.sys.windows().find((x) => pidOf(x.id) === Number(a));
        if (!w) {
          ctx.err(`kill: (${a}) - No such process`);
          continue;
        }
        ctx.out(`[${pidOf(w.id)}] Terminated  ${w.title}`, C.head);
        ctx.env.sys.closeWindow(w.id);
      }
    },
  },
  {
    name: 'killall',
    usage: 'killall <app>',
    desc: 'close every window of an app',
    group: 'system',
    aliases: ['pkill', 'close'],
    run(ctx) {
      if (!ctx.args.length) return ctx.err(`usage: ${ctx.name} <app>`);
      for (const a of ctx.args) {
        const wins = ctx.env.sys.windows().filter((w) => w.appId === a.toLowerCase());
        if (!wins.length) {
          ctx.err(`${ctx.name}: ${a}: no process found`);
          continue;
        }
        for (const w of wins) {
          ctx.out(`[${pidOf(w.id)}] Terminated  ${w.title}`, C.head);
          ctx.env.sys.closeWindow(w.id);
        }
      }
    },
  },
  {
    name: 'apps',
    usage: 'apps',
    desc: 'installed applications',
    group: 'system',
    run(ctx) {
      for (const id of DOCK_ORDER) {
        const m = APP_META[id];
        ctx.print([
          { t: `  ${id.padEnd(13)}`, c: C.app },
          { t: m.name.padEnd(14), c: C.text },
          { t: ctx.env.sys.windows().some((w) => w.appId === id) ? 'running' : '', c: C.ok },
        ]);
      }
    },
  },
  {
    name: 'theme',
    usage: 'theme [light|dark]',
    desc: 'switch the OS theme',
    group: 'system',
    run(ctx) {
      const mode = ctx.args[0]?.toLowerCase();
      if (!mode) return ctx.out(`Theme: ${ctx.env.sys.getTheme() ?? 'system'}`);
      if (mode === 'light' || mode === 'dark') {
        ctx.env.sys.setTheme(mode);
        return ctx.out(`Theme set to ${mode}.`, C.ok);
      }
      ctx.err('usage: theme <light|dark>');
    },
  },
  {
    name: 'wallpaper',
    usage: 'wallpaper [name]',
    desc: 'list or set the wallpaper',
    group: 'system',
    run(ctx) {
      const id = ctx.args[0]?.toLowerCase();
      if (!id)
        return ctx.print(
          ...WALLPAPERS.map((w) => [
            { t: `  ${w.id.padEnd(14)}`, c: C.bright },
            { t: `${w.label.padEnd(16)}`, c: C.text },
            { t: w.dark ? 'dark' : 'light', c: C.dim },
          ])
        );
      const wp = WALLPAPERS.find((w) => w.id === id);
      if (!wp) return ctx.err(`wallpaper: ${id}: not found (run wallpaper to list)`);
      ctx.env.sys.setWallpaper(wp.id);
      ctx.out(`Wallpaper set to ${wp.label} (for ${wp.dark ? 'dark' : 'light'} mode).`, C.ok);
    },
  },
  {
    name: 'posts',
    usage: 'posts',
    desc: 'list blog posts · read <slug>',
    group: 'system',
    aliases: ['blog'],
    run(ctx) {
      const posts = ctx.env.sys.posts.filter((p) => !p.hideFromBlogList);
      if (!posts.length) return ctx.out('No posts loaded.', C.dim);
      for (const p of posts)
        ctx.print([
          { t: `  ${p.date.slice(0, 10)}  `, c: C.dim },
          { t: p.slug.padEnd(40), c: C.link },
          { t: p.title, c: C.text },
        ]);
    },
  },
  {
    name: 'read',
    usage: 'read <slug>',
    desc: 'open a blog post',
    group: 'system',
    run(ctx) {
      const q = ctx.args.join(' ').toLowerCase();
      if (!q) return ctx.err('usage: read <slug>');
      const p = ctx.env.sys.posts.find((x) => x.slug === q) ?? ctx.env.sys.posts.find((x) => x.slug.includes(q) || x.title.toLowerCase().includes(q));
      if (!p) return ctx.err(`read: no post matching '${q}'`);
      ctx.env.sys.openApp('blog', { props: { slug: p.slug }, title: 'Blog' });
      ctx.out(`Opening “${p.title}”…`, C.ok);
    },
  },
  {
    name: 'todo',
    usage: 'todo',
    desc: 'open the todo list (GitHub issues)',
    group: 'system',
    aliases: ['issues'],
    run(ctx) {
      ctx.env.sys.openApp('todo');
    },
  },
  {
    name: 'socials',
    usage: 'socials',
    desc: 'where to find me',
    group: 'system',
    aliases: ['links', 'contact'],
    run: (ctx) => ctx.print(out('Find me online:', C.head), ...socials.map((s) => out(`  ${s.label.padEnd(10)} ${s.url}`, C.link))),
  },
  {
    name: 'shutdown',
    usage: 'shutdown',
    desc: 'power off',
    group: 'system',
    aliases: ['halt', 'poweroff'],
    run(ctx) {
      ctx.out('Broadcast message from ed@kranz.au: The system is going down for power off NOW!', C.head);
      window.setTimeout(() => ctx.env.sys.shutdown(), 700);
    },
  },
  {
    name: 'reboot',
    usage: 'reboot',
    desc: 'restart the OS',
    group: 'system',
    aliases: ['restart'],
    run(ctx) {
      ctx.out('Rebooting…', C.head);
      window.setTimeout(() => ctx.env.sys.reboot(), 600);
    },
  },
  {
    name: 'sudo',
    usage: 'sudo',
    desc: '',
    group: 'system',
    hidden: true,
    run: (ctx) => ctx.err('ed is not in the sudoers file. This incident will be reported. 🙃'),
  },
  { name: 'su', usage: 'su', desc: '', group: 'system', hidden: true, run: (ctx) => ctx.err("su: Authentication failure (the password is not 'password')") },
  {
    name: 'passwd',
    usage: 'passwd',
    desc: '',
    group: 'system',
    hidden: true,
    run: (ctx) => ctx.err('passwd: Authentication token manipulation error (nice try)'),
  },
  {
    name: 'free',
    usage: 'free',
    desc: '',
    group: 'system',
    hidden: true,
    run: (ctx) =>
      ctx.print(
        out('              total        used        free      shared', C.dim),
        out('Mem:           16Gi        42Mi        ∞Gi         1dog'),
        out('Swap:           0Bi         0Bi         0Bi  (it is a browser tab)')
      ),
  },
  {
    name: 'ping',
    usage: 'ping <host>',
    desc: '',
    group: 'system',
    hidden: true,
    run(ctx) {
      const host = ctx.args[0] ?? 'kranz.au';
      const local = /kranz\.au|localhost|127\.0\.0\.1/.test(host);
      ctx.out(`PING ${host} (${local ? '127.0.0.1' : '203.0.113.42'}) 56(84) bytes of data.`);
      for (let i = 1; i <= 4; i++)
        ctx.out(
          `64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${local ? (0.02 + Math.random() * 0.05).toFixed(3) : (12 + Math.random() * 30).toFixed(1)} ms`
        );
      ctx.out(`--- ${host} ping statistics ---`, C.dim);
      ctx.out(`4 packets transmitted, 4 received, 0% packet loss${local ? '  (it is right here)' : ''}`, C.dim);
    },
  },
  {
    name: 'curl',
    usage: 'curl',
    desc: '',
    group: 'system',
    hidden: true,
    aliases: ['wget', 'fetch'],
    run: (ctx) => ctx.err(`${ctx.name}: (7) Failed to connect to ${ctx.args[0] ?? 'host'} port 443: Network is unreachable`),
  },
  {
    name: 'git',
    usage: 'git',
    desc: '',
    group: 'system',
    hidden: true,
    run(ctx) {
      const sub = ctx.args[0];
      if (sub === 'status')
        return ctx.print(
          out('On branch main'),
          out("Your branch is up to date with 'origin/main'."),
          [],
          out('nothing to commit, working tree clean (it is a website)', C.dim)
        );
      if (sub === 'push' && ctx.flags.has('f')) return ctx.err('no.');
      if (sub === 'blame') return ctx.out('It was ed. It is always ed.', C.head);
      if (sub === 'log')
        return ctx.print(
          out('commit 0xDEADBEEF (HEAD -> main)', C.head),
          out('Author: Eddie Kranz'),
          out(`Date:   ${new Date().toDateString()}`),
          [],
          out('    feat: everything, apparently')
        );
      ctx.err('fatal: not a git repository (or any of the parent directories): .git');
    },
  },
  {
    name: 'npm',
    usage: 'npm',
    desc: '',
    group: 'system',
    hidden: true,
    aliases: ['pnpm', 'yarn', 'npx', 'bun'],
    run: (ctx) =>
      ctx.print(
        out(`${ctx.name}: resolving 1,432 packages…`, C.dim),
        out(`${ctx.name}: just kidding. This OS has no node_modules and is happier for it. ✨`, C.head)
      ),
  },
  {
    name: 'apt',
    usage: 'apt',
    desc: '',
    group: 'system',
    hidden: true,
    aliases: ['apt-get', 'brew', 'pacman', 'dnf', 'yum', 'pip'],
    run: (ctx) => ctx.err(`E: Unable to locate package ${ctx.args[ctx.args.length - 1] ?? ''}. (This OS ships everything it needs.)`),
  },
  {
    name: 'ssh',
    usage: 'ssh',
    desc: '',
    group: 'system',
    hidden: true,
    aliases: ['telnet', 'scp'],
    run: (ctx) => ctx.err(`ssh: connect to host ${ctx.args[0] ?? 'somewhere'} port 22: Connection refused (it is a browser, mate)`),
  },
  {
    name: 'python',
    usage: 'python',
    desc: '',
    group: 'system',
    hidden: true,
    aliases: ['python3', 'node', 'ruby', 'perl', 'php'],
    run: (ctx) => ctx.err(`${ctx.name}: the only runtime here is JavaScript, and it is already running.`),
  },
];

// ===========================================================================
// Fun
// ===========================================================================

const say = (ctx: Ctx, tail: string[]) => {
  const t = ctx.args.join(' ') || (ctx.stdin ?? '') || 'Moo?';
  ctx.print(...bubble(t).map((l) => out(l, C.bright)), ...tail.map((l) => out(l, C.head)));
};

const fun: Cmd[] = [
  { name: 'cowsay', usage: 'cowsay <text>', desc: 'a cow says it', group: 'fun', run: (ctx) => say(ctx, ctx.flags.has('t') ? TUX : COW) },
  { name: 'dogsay', usage: 'dogsay <text>', desc: 'Zeppelin says it', group: 'fun', aliases: ['zepsay', 'woofsay'], run: (ctx) => say(ctx, DOG) },
  { name: 'fortune', usage: 'fortune', desc: 'a pearl of wisdom', group: 'fun', run: (ctx) => ctx.out(pick(FORTUNES), C.head) },
  {
    name: 'sl',
    usage: 'sl',
    desc: 'you meant ls, but here is a train',
    group: 'fun',
    run: (ctx) => ctx.print(...TRAIN),
  },
  {
    name: 'say',
    usage: 'say <text>',
    desc: 'the computer speaks',
    group: 'fun',
    run(ctx) {
      const t = ctx.args.join(' ') || (ctx.stdin ?? '');
      if (!t) return ctx.err('usage: say <text>');
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return ctx.err('say: no voice available in this browser');
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(t));
      ctx.out(`🔊 “${t}”`, C.ok);
    },
  },
  {
    name: 'woof',
    usage: 'woof',
    desc: 'talk to the dog',
    group: 'fun',
    aliases: ['zeppelin', 'dog', 'pet'],
    run: (ctx) => ctx.out(`Zeppelin: ${pick(BARKS)}`, C.head),
  },
  { name: 'vroom', usage: 'vroom', desc: 'motorbike noises', group: 'fun', aliases: ['motorbike', 'moto'], run: (ctx) => ctx.print(...MOTORBIKE) },
  {
    name: 'coffee',
    usage: 'coffee',
    desc: 'brew one',
    group: 'fun',
    run: (ctx) =>
      ctx.print(
        out('  ( (', C.dim),
        out('   ) )', C.dim),
        out(' ........', C.head),
        out(' |      |]', C.head),
        out(' \\      /', C.head),
        out("  `----'   brewing… done. Productivity +12%.", C.head)
      ),
  },
  {
    name: 'doom',
    usage: 'doom',
    desc: 'rip and tear',
    group: 'fun',
    hidden: true,
    run(ctx) {
      ctx.env.sys.openApp('doom');
      ctx.out('Rip and tear… 😈', C.red);
    },
  },
  {
    name: 'tetris',
    usage: 'tetris',
    desc: '',
    group: 'fun',
    hidden: true,
    run(ctx) {
      ctx.env.sys.openApp('tetris');
      ctx.out('Stack them up 🧱', C.ok);
    },
  },
  { name: 'xyzzy', usage: 'xyzzy', desc: '', group: 'fun', hidden: true, run: (ctx) => ctx.out('Nothing happens.', C.dim) },
  {
    name: 'matrix',
    usage: 'matrix',
    desc: '',
    group: 'fun',
    hidden: true,
    aliases: ['cmatrix'],
    run: (ctx) =>
      ctx.print(
        ...Array.from({ length: 8 }, () =>
          out(
            Array.from({ length: 48 }, () =>
              Math.random() < 0.2 ? ' ' : pick(['0', '1', 'ｱ', 'ｲ', 'ｳ', 'ｴ', 'ｵ', 'ｶ', 'ｷ', 'ｸ', 'ﾊ', 'ﾐ', 'ﾋ', 'ｰ', 'ｳ', 'ｼ'])
            ).join(''),
            'text-emerald-400'
          )
        ),
        out('Wake up, Neo… the terminal has you.', C.dim)
      ),
  },
];

export const COMMANDS: Cmd[] = [...fs, ...text, ...shell, ...system, ...fun];

const INDEX = new Map<string, Cmd>();
for (const c of COMMANDS) {
  INDEX.set(c.name, c);
  for (const a of c.aliases ?? []) INDEX.set(a, c);
}

export function findCommand(name: string): Cmd | undefined {
  return INDEX.get(name);
}

/** Every completable command word (names + aliases, joke commands included). */
export const COMMAND_WORDS: string[] = [...INDEX.keys()].sort();
