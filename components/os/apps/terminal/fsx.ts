/** Text-level helpers over the virtual file system, shared by the shell and its commands. */

import { type VDir, type VNode, listChildren, nodeAt, resolvePath } from '@/lib/os/filesystem';
import { C } from './types';

/** Split a file body into lines; an empty body is zero lines, and one trailing newline is dropped. */
export const splitLines = (s: string): string[] => (s === '' ? [] : s.replace(/\n$/, '').split('\n'));

/** What `cat`-like commands see when they read a node. */
export function fileText(node: VNode): string {
  if (node.type === 'dir') return '';
  if (node.kind === 'link') return node.href ?? '';
  if (node.kind === 'image') return `[image: ${node.src ?? node.name}]`;
  if (node.kind === 'app') return `[application: ${node.app ?? node.name}]`;
  return node.content ?? '';
}

/** Byte-ish size of a node (text length; a fixed nominal size for binaries and dirs). */
export function sizeOf(node: VNode): number {
  if (node.type === 'dir') return node.children.reduce((n, c) => n + sizeOf(c), 0) + 64;
  if (node.kind === 'image') return 24_576;
  if (node.kind === 'app') return 4_096;
  return (node.content ?? node.href ?? '').length;
}

export function human(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}K`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)}M`;
  return `${(n / 1024 ** 3).toFixed(1)}G`;
}

export const colorFor = (node: VNode): string => {
  if (node.type === 'dir') return C.dir;
  if (node.kind === 'app') return C.app;
  if (node.kind === 'image') return C.image;
  if (node.kind === 'link') return C.head;
  return C.text;
};

export const displayName = (node: VNode): string => (node.type === 'dir' ? `${node.name}/` : node.name);

/** Depth-first walk yielding every descendant with its path parts. */
export function* walk(dir: VDir, parts: string[]): Generator<{ node: VNode; parts: string[] }> {
  for (const child of listChildren(dir, true)) {
    const p = [...parts, child.name];
    yield { node: child, parts: p };
    if (child.type === 'dir') yield* walk(child, p);
  }
}

/** Turn a shell glob (`*`, `?`) into a RegExp. */
export function globToRegExp(glob: string): RegExp {
  const re = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${re}$`);
}

/** Expand a glob in the last path segment against the VFS (directory part is literal). */
export function expandGlob(root: VDir, cwd: string[], pattern: string): string[] {
  const cut = pattern.lastIndexOf('/');
  const dirPart = cut >= 0 ? pattern.slice(0, cut + 1) : '';
  const leaf = cut >= 0 ? pattern.slice(cut + 1) : pattern;
  const d = nodeAt(root, resolvePath(cwd, dirPart || '.'));
  if (!d || d.type !== 'dir') return [];
  const re = globToRegExp(leaf);
  return listChildren(d, leaf.startsWith('.'))
    .filter((k) => re.test(k.name))
    .map((k) => dirPart + k.name);
}
