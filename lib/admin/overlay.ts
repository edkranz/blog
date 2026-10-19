import { byDateDesc, draftMeta } from './post-meta.ts';
import { type AdminPostMeta, PROFILE_FILE, type PendingChange } from './types.ts';

export type Remote = { profile: unknown; projects: unknown[]; posts: AdminPostMeta[] };

export function pendingKey(c: PendingChange): string {
  if (c.kind === 'json') return `json:${c.file}`;
  if (c.kind === 'post') return `post:${c.draft.slug}`;
  if (c.kind === 'delete-post') return `post:${c.slug}`;
  return `upload:${c.path}`;
}

/** The remote snapshot as it will look once the pending changes are committed. */
export function overlay(remote: Remote, pending: Record<string, PendingChange>): Remote {
  const changes = Object.values(pending);
  if (changes.length === 0) return remote;
  let { profile, projects, posts } = remote;
  for (const c of changes) {
    if (c.kind === 'json') {
      if (c.file === PROFILE_FILE) profile = c.value;
      else projects = c.value as unknown[];
    } else if (c.kind === 'post') {
      posts = [...posts.filter((p) => p.slug !== c.draft.slug), draftMeta(c.draft, c.path)];
    } else if (c.kind === 'delete-post') {
      posts = posts.filter((p) => p.slug !== c.slug);
    }
  }
  return { profile, projects, posts: [...posts].sort(byDateDesc) };
}
