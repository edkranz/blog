/**
 * A small but *writable* virtual file system for the OS.
 *
 * The tree is seeded from `lib/eddie.ts` (so it stays honest with the rest of the
 * site) and then lives in a persisted store (`lib/os/fs-store.ts`) so the user can
 * mkdir / touch / nano / rm / mv / cp and have it stick across reloads. The Terminal
 * and the Files app both read and mutate that single tree.
 *
 * Path helpers are pure; mutation helpers take a root and return a fresh root (or an
 * error string), so callers can drop the result straight into the store.
 */

import { education, hobbies, profile, projects, skills, socials, technologies } from '@/lib/eddie';
import type { AppId } from './types';

export type FileKind = 'text' | 'markdown' | 'image' | 'link' | 'app';

export type VFile = {
  type: 'file';
  name: string;
  kind: FileKind;
  /** Text body for `text` / `markdown` files. */
  content?: string;
  /** Image source for `image` files. */
  src?: string;
  /** External URL for `link` files. */
  href?: string;
  /** App to launch for `app` files. */
  app?: AppId;
  /** Short one-liner shown in the Files app. */
  info?: string;
};

export type VDir = {
  type: 'dir';
  name: string;
  info?: string;
  children: VNode[];
};

export type VNode = VFile | VDir;

/** The home directory, where the Terminal and Files app start. */
export const HOME = ['home', 'ed'];

/** Bump when the seed content changes — persisted file systems re-seed on mismatch. */
export const SEED_VERSION = 5;

// ---- builders -------------------------------------------------------------

const file = (name: string, kind: FileKind, extra: Partial<VFile> = {}): VFile => ({ type: 'file', name, kind, ...extra });
const dir = (name: string, children: VNode[], info?: string): VDir => ({ type: 'dir', name, children, info });

const README = `# kranz.au

Eddie Kranz's personal site: a small desktop that runs in the browser.
This file system lives in your browser and persists between visits.
`;

const ABOUT = `${profile.intro}.

${profile.blurb}

  Role:     ${profile.role} @ ${profile.company.name}
  Location: ${profile.location}
  Email:    ${profile.email}

"${profile.tagline}"
`;

const RESUME = `${profile.name}
${profile.role} @ ${profile.company.name}, ${profile.location}

EDUCATION
${education.map((e) => `  • ${e}`).join('\n')}

CONTACT
  ${profile.email}
  ${profile.company.url}
`;

const SKILLS = `CORE SKILLS
${skills.map((s) => `  • ${s.title}\n      ${s.body}`).join('\n')}

TECHNOLOGIES
  ${technologies.join(' · ')}
`;

const CONTACT = `Get in touch:

${socials.map((s) => `  ${s.label.padEnd(12)} ${s.url}`).join('\n')}

Email me directly: ${profile.email}
`;

const HOBBIES = `Off the keyboard:

${hobbies.map((h) => `  • ${h}`).join('\n')}
`;

const ESHRC = `# ~/.config/eksh.rc
export EDITOR=nano
export PAGER=less
alias ll='ls -la'
alias work='open terminal'
alias play='open tetris'
`;

const HELLO_SH = `#!/bin/sh
echo "hello from $USER@$HOSTNAME"
pwd
ls ~
neofetch
`;

const ENV = `# .env: you really shouldn't be reading this 👀
GITHUB_TOKEN=ghp_************************  # nice try
OPENAI_API_KEY=sk-proj-********************
DEPLOY_KEY=*****************************
COFFEE_LEVEL=critically_low
SECRET=bush did 9/11
`;

const projectMd = (p: (typeof projects)[number]): string =>
  [
    `# ${p.title}`,
    `${p.emoji}  ${p.subtitle} · ${p.year}`,
    '',
    p.description,
    '',
    `Tech: ${p.tech.join(', ')}`,
    p.link ? `Link: ${p.link.kind === 'url' ? p.link.href : p.link.label}` : '',
  ]
    .filter(Boolean)
    .join('\n');

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ---- the seed tree --------------------------------------------------------

const APPS: { id: AppId; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'blog', label: 'Blog' },
  { id: 'projects', label: 'Projects' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'files', label: 'Files' },
  { id: 'contact', label: 'Contact' },
  { id: 'todo', label: 'Todo' },
  { id: 'settings', label: 'Settings' },
  { id: 'minesweeper', label: 'Minesweeper' },
  { id: 'tetris', label: 'Tetris' },
  { id: 'doom', label: 'Doom' },
];

const SEED_ROOT: VDir = dir('', [
  dir(
    'home',
    [
      dir(
        'ed',
        [
          file('README.md', 'markdown', { content: README }),
          file('about.txt', 'text', { content: ABOUT, info: 'Who is this guy?' }),
          file('resume.txt', 'text', { content: RESUME, info: 'The short version' }),
          file('skills.txt', 'text', { content: SKILLS, info: 'What I work with' }),
          file('contact.txt', 'text', { content: CONTACT, info: 'Say hello' }),
          file('hobbies.txt', 'text', { content: HOBBIES, info: 'Off the keyboard' }),
          file('hello.sh', 'text', { content: HELLO_SH, info: 'Shell script' }),
          dir(
            'projects',
            projects.map((p) => file(`${slug(p.title)}.md`, 'markdown', { content: projectMd(p), info: p.subtitle }))
          ),
          dir('blog', [file('open-blog.app', 'app', { app: 'blog', info: 'Read the blog' })], 'Long-form writing'),
          dir(
            'photos',
            [
              file('zeppelin.png', 'image', { src: '/zeppelin/sit.png', info: 'The good boy' }),
              file('me.png', 'image', { src: '/icons/face.png', info: 'Hello there' }),
            ],
            'A few pictures'
          ),
          dir(
            'games',
            [
              file('doom.app', 'app', { app: 'doom', info: 'Rip and tear' }),
              file('tetris.app', 'app', { app: 'tetris', info: 'Stack the blocks' }),
              file('minesweeper.app', 'app', { app: 'minesweeper', info: "Don't click the bomb" }),
            ],
            'Take a break'
          ),
          dir('.config', [file('eksh.rc', 'text', { content: ESHRC, info: 'Shell config' })], 'Dotfiles'),
          dir('.secrets', [file('.env', 'text', { content: ENV, info: '🤫' })], 'Nothing to see here'),
        ],
        'Home'
      ),
    ],
    'User home directories'
  ),
  dir(
    'Applications',
    APPS.map((a) => file(`${a.label}.app`, 'app', { app: a.id, info: `Launch ${a.label}` })),
    'Installed apps'
  ),
]);

/** A fresh, independent copy of the seed tree. */
export function buildSeedRoot(): VDir {
  return structuredClone(SEED_ROOT);
}

// ---- navigation -----------------------------------------------------------

/** Resolve a path (absolute, ~-relative, or cwd-relative), collapsing `.`/`..`. */
export function resolvePath(cwd: string[], input: string): string[] {
  const raw = input.trim();
  let parts: string[];
  if (raw === '') parts = [...cwd];
  else if (raw === '~') parts = [...HOME];
  else if (raw.startsWith('~/')) parts = [...HOME, ...raw.slice(2).split('/')];
  else if (raw.startsWith('/')) parts = raw.split('/');
  else parts = [...cwd, ...raw.split('/')];

  const out: string[] = [];
  for (const seg of parts) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return out;
}

/** The node at an absolute path array, or null if it doesn't exist. */
export function nodeAt(root: VDir, parts: string[]): VNode | null {
  let node: VNode = root;
  for (const seg of parts) {
    if (node.type !== 'dir') return null;
    const next = node.children.find((c) => c.name === seg);
    if (!next) return null;
    node = next;
  }
  return node;
}

export function dirAt(root: VDir, parts: string[]): VDir | null {
  const n = nodeAt(root, parts);
  return n && n.type === 'dir' ? n : null;
}

/** Pretty path with `~` for the home directory. */
export function displayPath(parts: string[]): string {
  if (parts[0] === 'home' && parts[1] === 'ed') {
    const rest = parts.slice(2);
    return rest.length ? `~/${rest.join('/')}` : '~';
  }
  return `/${parts.join('/')}`;
}

export function absPath(parts: string[]): string {
  return `/${parts.join('/')}`;
}

/** Children sorted dirs-first then alphabetical (hidden dotfiles optional). */
export function listChildren(d: VDir, showHidden = false): VNode[] {
  return d.children
    .filter((c) => showHidden || !c.name.startsWith('.'))
    .slice()
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export const kindGlyph: Record<FileKind | 'dir', string> = {
  dir: '📁',
  text: '📄',
  markdown: '📝',
  image: '🖼️',
  link: '🔗',
  app: '🚀',
};

// ---- mutation -------------------------------------------------------------

export type FSResult = { ok: true; root: VDir } | { ok: false; error: string };

const ok = (root: VDir): FSResult => ({ ok: true, root });
const err = (error: string): FSResult => ({ ok: false, error });

const parentOf = (parts: string[]) => ({ parent: parts.slice(0, -1), name: parts[parts.length - 1] });

/** Guess a sensible file kind for a brand-new file from its extension. */
export function guessKind(name: string): FileKind {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  return 'text';
}

/** A writable file is plain text we can edit (not an app/image/link shortcut). */
export function isEditable(node: VNode): node is VFile {
  return node.type === 'file' && (node.kind === 'text' || node.kind === 'markdown');
}

export function fsMkdir(root: VDir, cwd: string[], target: string, recursive = false): FSResult {
  const parts = resolvePath(cwd, target);
  if (parts.length === 0) return err(`mkdir: ${target}: cannot create`);
  const next = structuredClone(root);
  if (recursive) {
    let node: VNode = next;
    for (const seg of parts) {
      if (node.type !== 'dir') return err(`mkdir: ${seg}: Not a directory`);
      let child = node.children.find((c) => c.name === seg);
      if (!child) {
        child = { type: 'dir', name: seg, children: [] };
        node.children.push(child);
      } else if (child.type !== 'dir') {
        return err(`mkdir: ${seg}: Not a directory`);
      }
      node = child;
    }
    return ok(next);
  }
  const { parent, name } = parentOf(parts);
  const p = nodeAt(next, parent);
  if (!p || p.type !== 'dir') return err(`mkdir: ${target}: No such file or directory`);
  if (p.children.some((c) => c.name === name)) return err(`mkdir: ${target}: File exists`);
  p.children.push({ type: 'dir', name, children: [] });
  return ok(next);
}

export function fsTouch(root: VDir, cwd: string[], target: string): FSResult {
  const parts = resolvePath(cwd, target);
  const { parent, name } = parentOf(parts);
  const next = structuredClone(root);
  const p = nodeAt(next, parent);
  if (!p || p.type !== 'dir') return err(`touch: ${target}: No such file or directory`);
  if (!p.children.some((c) => c.name === name)) p.children.push({ type: 'file', name, kind: guessKind(name), content: '' });
  return ok(next);
}

export function fsWrite(root: VDir, cwd: string[], target: string, content: string, append = false): FSResult {
  const parts = resolvePath(cwd, target);
  const { parent, name } = parentOf(parts);
  const next = structuredClone(root);
  const p = nodeAt(next, parent);
  if (!p || p.type !== 'dir') return err(`${target}: No such file or directory`);
  const existing = p.children.find((c) => c.name === name);
  if (existing) {
    if (existing.type !== 'file') return err(`${target}: Is a directory`);
    if (!isEditable(existing)) return err(`${target}: cannot write to this file`);
    existing.content = append ? (existing.content ?? '') + content : content;
  } else {
    p.children.push({ type: 'file', name, kind: guessKind(name), content });
  }
  return ok(next);
}

export function fsRemove(root: VDir, cwd: string[], target: string, recursive = false): FSResult {
  const parts = resolvePath(cwd, target);
  if (parts.length === 0) return err(`rm: refusing to remove /`);
  const { parent, name } = parentOf(parts);
  const next = structuredClone(root);
  const p = nodeAt(next, parent);
  if (!p || p.type !== 'dir') return err(`rm: ${target}: No such file or directory`);
  const idx = p.children.findIndex((c) => c.name === name);
  if (idx < 0) return err(`rm: ${target}: No such file or directory`);
  const node = p.children[idx];
  if (node.type === 'dir' && node.children.length > 0 && !recursive) return err(`rm: ${target}: is a directory (use rm -r)`);
  p.children.splice(idx, 1);
  return ok(next);
}

export function fsMove(root: VDir, cwd: string[], src: string, dst: string, copy = false): FSResult {
  const srcParts = resolvePath(cwd, src);
  if (srcParts.length === 0) return err(`${src}: cannot move root`);
  const next = structuredClone(root);
  const srcParent = nodeAt(next, srcParts.slice(0, -1));
  const srcName = srcParts[srcParts.length - 1];
  if (!srcParent || srcParent.type !== 'dir') return err(`${src}: No such file or directory`);
  const srcIdx = srcParent.children.findIndex((c) => c.name === srcName);
  if (srcIdx < 0) return err(`${src}: No such file or directory`);
  const node = srcParent.children[srcIdx];

  // Resolve the destination: into an existing dir, or to a new name.
  const dstParts = resolvePath(cwd, dst);
  const dstNode = nodeAt(next, dstParts);
  let targetParent: VNode | null;
  let targetName: string;
  if (dstNode && dstNode.type === 'dir') {
    targetParent = dstNode;
    targetName = srcName;
  } else {
    targetParent = nodeAt(next, dstParts.slice(0, -1));
    targetName = dstParts[dstParts.length - 1];
  }
  if (!targetParent || targetParent.type !== 'dir') return err(`${dst}: No such file or directory`);
  if (targetParent === node) return err(`${dst}: cannot move into itself`);

  const moved = copy ? structuredClone(node) : node;
  moved.name = targetName;
  if (!copy) srcParent.children.splice(srcIdx, 1);
  const exIdx = targetParent.children.findIndex((c) => c.name === targetName);
  if (exIdx >= 0) targetParent.children.splice(exIdx, 1);
  targetParent.children.push(moved);
  return ok(next);
}

export function fsRename(root: VDir, parentParts: string[], oldName: string, newName: string): FSResult {
  const next = structuredClone(root);
  const p = nodeAt(next, parentParts);
  if (!p || p.type !== 'dir') return err('No such directory');
  const node = p.children.find((c) => c.name === oldName);
  if (!node) return err('No such file');
  if (p.children.some((c) => c.name === newName)) return err('Name already exists');
  node.name = newName;
  return ok(next);
}
