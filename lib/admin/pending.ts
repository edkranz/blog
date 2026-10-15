// Pure bookkeeping for the admin store's pending changes. Import-free of the client so Node can test it.

import type { PendingChange } from './types.ts';

type Pending = Record<string, PendingChange>;

/** After a successful save, drop what was sent but keep anything staged while the request was in flight. */
export function settlePending(current: Pending, sent: Pending): Pending {
  const out: Pending = {};
  for (const [k, v] of Object.entries(current)) if (sent[k] !== v) out[k] = v;
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Replay my edits (base -> mine) onto a newer upstream value (base -> next), leaf by leaf.
 * Where both sides changed the same leaf, or the shape of an array changed, mine wins.
 */
export function rebaseJson(base: unknown, mine: unknown, next: unknown): unknown {
  if (same(base, mine)) return next;
  if (isRecord(base) && isRecord(mine) && isRecord(next)) {
    const out: Record<string, unknown> = { ...next };
    for (const k of new Set([...Object.keys(base), ...Object.keys(mine)])) {
      if (!(k in mine)) {
        if (same(base[k], next[k])) delete out[k];
        continue;
      }
      out[k] = rebaseJson(base[k], mine[k], next[k]);
    }
    return out;
  }
  if (Array.isArray(base) && Array.isArray(mine) && Array.isArray(next) && base.length === mine.length && base.length === next.length) {
    return next.map((n, i) => rebaseJson(base[i], mine[i], n));
  }
  return mine;
}

/** "My Photo (1).PNG" -> "my-photo-1.png": the shape `toFileChanges` accepts for uploads. */
export function uploadName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-*\.+-*/g, '.')
    .replace(/^[-.]+|[-.]+$/g, '');
}

/** `public/uploads/posts/<slug>/<name>`, suffixed -2, -3… past any path already taken. */
export function uniqueUploadPath(slug: string, name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let path = `public/uploads/posts/${slug}/${name}`;
  for (let n = 2; used.has(path); n++) path = `public/uploads/posts/${slug}/${stem}-${n}${ext}`;
  return path;
}

/** Drop staged images that no staged post body references (removed from the post before saving). */
export function pruneUploads(pending: Pending): Pending {
  const bodies = Object.values(pending)
    .map((c) => (c.kind === 'post' ? c.draft.body : ''))
    .join('\n');
  const out: Pending = {};
  for (const [k, c] of Object.entries(pending)) if (c.kind !== 'upload' || bodies.includes(c.path.slice('public'.length))) out[k] = c;
  return out;
}
