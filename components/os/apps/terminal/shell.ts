/**
 * eksh — the interpreter behind the Terminal app.
 *
 * Supports quoting ('…' "…" \x), `$VAR` / `${VAR}` / `$?` expansion, globs (`*.md`), aliases,
 * `VAR=value` assignments, `;` / `&&` / `||` chaining, `|` pipelines and `>` / `>>` redirection.
 * Commands themselves live in `commands.ts`; this file only parses and dispatches.
 */

import { absPath, fsWrite, nodeAt, resolvePath } from '@/lib/os/filesystem';
import { findCommand } from './commands';
import { expandGlob, fileText, splitLines } from './fsx';
import { C, type Ctx, type Env, type Line, lineText, out } from './types';

type Tok = { text: string; op?: true; glob?: boolean; quoted?: boolean; noAlias?: boolean };

const OPS = ['>>', '|', '>'];
const FORK_BOMB = /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/;

// ---- expansion ------------------------------------------------------------

function getVar(name: string, env: Env): string {
  if (name === 'PWD') return absPath(env.getCwd());
  if (name === '?') return String(env.state.lastStatus);
  return env.state.vars[name] ?? '';
}

/** Read a `$…` reference starting at `i`; null when it's just a literal dollar. */
function readVar(s: string, i: number, env: Env): { value: string; next: number } | null {
  if (s[i + 1] === '?') return { value: getVar('?', env), next: i + 2 };
  if (s[i + 1] === '{') {
    const end = s.indexOf('}', i);
    if (end < 0) return null;
    return { value: getVar(s.slice(i + 2, end), env), next: end + 1 };
  }
  const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i + 1));
  if (!m) return null;
  return { value: getVar(m[0], env), next: i + 1 + m[0].length };
}

export function tokenize(line: string, env: Env): Tok[] {
  const toks: Tok[] = [];
  let cur = '';
  let started = false;
  let quoted = false;
  let glob = false;
  const flush = () => {
    if (started) toks.push({ text: cur, glob: glob && !quoted, quoted });
    cur = '';
    started = false;
    quoted = false;
    glob = false;
  };
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === "'") {
      const end = line.indexOf("'", i + 1);
      cur += end < 0 ? line.slice(i + 1) : line.slice(i + 1, end);
      started = true;
      quoted = true;
      i = end < 0 ? line.length : end + 1;
      continue;
    }
    if (ch === '"') {
      started = true;
      quoted = true;
      i++;
      while (i < line.length && line[i] !== '"') {
        if (line[i] === '\\' && i + 1 < line.length && '"\\$'.includes(line[i + 1])) {
          cur += line[i + 1];
          i += 2;
          continue;
        }
        if (line[i] === '$') {
          const r = readVar(line, i, env);
          if (r) {
            cur += r.value;
            i = r.next;
            continue;
          }
        }
        cur += line[i++];
      }
      i++;
      continue;
    }
    if (ch === '\\' && i + 1 < line.length) {
      started = true;
      cur += line[i + 1];
      i += 2;
      continue;
    }
    if (/\s/.test(ch)) {
      flush();
      i++;
      continue;
    }
    const op = OPS.find((o) => line.startsWith(o, i));
    if (op) {
      flush();
      toks.push({ text: op, op: true });
      i += op.length;
      continue;
    }
    if (ch === '$') {
      const r = readVar(line, i, env);
      if (r) {
        started = true;
        cur += r.value;
        i = r.next;
        continue;
      }
    }
    if (ch === '*' || ch === '?') glob = true;
    started = true;
    cur += ch;
    i++;
  }
  flush();
  return toks;
}

/** `!!`, `!3`, `!ls` → the matching history line. */
export function expandHistory(line: string, history: string[]): string {
  const m = /^!(!|\d+|[A-Za-z][\w-]*)(.*)$/.exec(line.trim());
  if (!m) return line;
  const [, ref, rest] = m;
  let hit: string | undefined;
  if (ref === '!') hit = history[history.length - 1];
  else if (/^\d+$/.test(ref)) hit = history[Number(ref) - 1];
  else hit = [...history].reverse().find((h) => h.startsWith(ref));
  return hit ? hit + rest : line;
}

// ---- arguments ------------------------------------------------------------

export function parseArgs(raw: string[], valued: string[]): Pick<Ctx, 'args' | 'flags' | 'opts'> {
  const args: string[] = [];
  const flags = new Set<string>();
  const opts: Record<string, string> = {};
  let onlyArgs = false;
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (onlyArgs || a === '-' || !a.startsWith('-') || a.length < 2) {
      args.push(a);
      continue;
    }
    if (a === '--') {
      onlyArgs = true;
      continue;
    }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const key = eq >= 0 ? a.slice(2, eq) : a.slice(2);
      if (eq >= 0) opts[key] = a.slice(eq + 1);
      else if (valued.includes(key)) opts[key] = raw[++i] ?? '';
      else flags.add(key);
      continue;
    }
    const word = a.slice(1);
    if (/^\d+$/.test(word)) {
      opts.n = word; // head -5
      continue;
    }
    if (valued.includes(word)) {
      opts[word] = raw[++i] ?? ''; // find -name x
      continue;
    }
    for (let j = 0; j < word.length; j++) {
      const ch = word[j];
      if (valued.includes(ch)) {
        opts[ch] = word.slice(j + 1) || raw[++i] || ''; // -n5 or -n 5
        break;
      }
      flags.add(ch);
    }
  }
  return { args, flags, opts };
}

// ---- execution ------------------------------------------------------------

function fail(env: Env, msg: string) {
  env.print(out(msg, C.err));
  env.state.lastStatus = 1;
}

function readLines(ctx: Ctx, files?: string[]): string[] | null {
  const names = files ?? ctx.args;
  if (names.length > 0 && !(names.length === 1 && names[0] === '-')) {
    const all: string[] = [];
    for (const f of names) {
      const node = nodeAt(ctx.env.getRoot(), resolvePath(ctx.cwd, f));
      if (!node) {
        ctx.err(`${ctx.name}: ${f}: No such file or directory`);
        return null;
      }
      if (node.type === 'dir') {
        ctx.err(`${ctx.name}: ${f}: Is a directory`);
        return null;
      }
      all.push(...splitLines(fileText(node)));
    }
    return all;
  }
  if (ctx.stdin !== null) return splitLines(ctx.stdin);
  return null;
}

function runSimple(input: Tok[], env: Env) {
  let toks = input;

  // Alias expansion on the first word — repeated for chained aliases, but never for a
  // word that came out of its own alias (so `alias ls='ls -a'` can't loop).
  for (let n = 0; n < 8; n++) {
    const first = toks[0];
    const value = first && !first.quoted && !first.noAlias ? env.state.aliases[first.text] : undefined;
    if (value === undefined) break;
    const aliasToks = tokenize(value, env);
    if (aliasToks.some((t) => t.op) || splitStatements(value).length > 1) {
      // The alias contains operators — re-run the whole line through the parser.
      const rest = toks
        .slice(1)
        .map((t) => `'${t.text.replace(/'/g, "'\\''")}'`)
        .join(' ');
      env.exec(`${value} ${rest}`, { ...env, depth: env.depth + 1 });
      return;
    }
    if (aliasToks[0]?.text === first.text) aliasToks[0].noAlias = true;
    toks = [...aliasToks, ...toks.slice(1)];
  }

  // Globs.
  const words: string[] = [];
  for (const t of toks) {
    if (t.glob) {
      const hits = expandGlob(env.getRoot(), env.getCwd(), t.text);
      words.push(...(hits.length ? hits : [t.text]));
    } else words.push(t.text);
  }
  const [name, ...raw] = words;
  if (!name) return;

  // `NAME=value` on its own is an assignment.
  const assign = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(name);
  if (assign && raw.length === 0) {
    env.state.vars[assign[1]] = assign[2];
    env.state.lastStatus = 0;
    return;
  }

  // `./script.sh` and any other path runs as a script.
  const lower = name.toLowerCase();
  const cmd = name.includes('/') ? findCommand('sh') : findCommand(lower);
  if (!cmd) {
    fail(env, `eksh: command not found: ${name}`);
    return;
  }
  const argv = name.includes('/') ? [name, ...raw] : raw;
  const parsed = parseArgs(argv, cmd.valued ?? []);
  env.state.lastStatus = 0;
  const ctx: Ctx = {
    env,
    name: cmd.name,
    ...parsed,
    raw: argv,
    cwd: env.getCwd(),
    root: env.getRoot(),
    stdin: env.stdin,
    print: env.print,
    out: (t, c) => env.print(out(t, c)),
    err: (msg) => fail(env, msg),
    readLines: (files) => readLines(ctx, files),
  };
  cmd.run(ctx);
}

/** One statement: an optional pipeline with an optional trailing `> file` / `>> file`. */
function execStatement(toks: Tok[], env: Env) {
  let redir: { op: '>' | '>>'; file: string } | null = null;
  const body: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.op && (t.text === '>' || t.text === '>>')) {
      const f = toks[i + 1];
      if (!f || f.op) return fail(env, "eksh: syntax error near unexpected token `newline'");
      redir = { op: t.text as '>' | '>>', file: f.text };
      i++;
      continue;
    }
    body.push(t);
  }
  const segments: Tok[][] = [[]];
  for (const t of body) {
    if (t.op && t.text === '|') segments.push([]);
    else segments[segments.length - 1].push(t);
  }
  if (segments.some((s) => s.length === 0)) return fail(env, "eksh: syntax error near unexpected token `|'");

  let stdin: string | null = env.stdin;
  const last = segments.length - 1;
  segments.forEach((seg, i) => {
    const captured: Line[] = [];
    const capture = i < last || redir !== null;
    runSimple(seg, { ...env, stdin, print: capture ? (...ls) => captured.push(...ls) : env.print });
    stdin = captured.map(lineText).join('\n');
  });
  if (redir) {
    const text = stdin ?? '';
    const res = fsWrite(env.getRoot(), env.getCwd(), redir.file, text ? `${text}\n` : '', redir.op === '>>');
    if (res.ok) env.setRoot(res.root);
    else fail(env, res.error);
  }
}

/**
 * Split a line into statements on unquoted `;`, `&&`, `||`. Each statement keeps its raw
 * source text, because expansion (`$VAR`, globs) must happen just before *that* statement
 * runs — `X=1; echo $X` only works if the echo is expanded after the assignment.
 */
export function splitStatements(line: string): { joiner: string | null; src: string }[] {
  const stmts: { joiner: string | null; src: string }[] = [];
  let joiner: string | null = null;
  let start = 0;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const end = line.indexOf(ch, i + 1);
      i = end < 0 ? line.length : end + 1;
      continue;
    }
    const op = ch === ';' ? ';' : line.startsWith('&&', i) ? '&&' : line.startsWith('||', i) ? '||' : null;
    if (op) {
      stmts.push({ joiner, src: line.slice(start, i) });
      joiner = op;
      i += op.length;
      start = i;
      continue;
    }
    i++;
  }
  stmts.push({ joiner, src: line.slice(start) });
  return stmts;
}

/** Run one line of shell input. */
export function execLine(line: string, env: Env): void {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  if (env.depth > 12) return fail(env, 'eksh: maximum recursion depth exceeded');
  if (FORK_BOMB.test(trimmed)) {
    env.sys.meltdown('FORK_BOMB_DETONATED');
    return;
  }

  for (const s of splitStatements(trimmed)) {
    if (!s.src.trim()) continue;
    if (s.joiner === '&&' && env.state.lastStatus !== 0) continue;
    if (s.joiner === '||' && env.state.lastStatus === 0) continue;
    execStatement(tokenize(s.src, env), env);
  }
}
