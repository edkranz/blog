import { PROFILE_FILE, type PendingChange } from './types.ts';

export function defaultMessage(changes: PendingChange[]): string {
  const posts = changes.filter((c) => c.kind === 'post');
  if (posts.length === 1 && changes.every((c) => c.kind === 'post' || c.kind === 'upload')) {
    const { draft, isNew } = posts[0];
    return `${isNew ? 'Add' : 'Edit'} post: ${draft.title || draft.slug}`;
  }
  if (changes.length === 1) {
    const c = changes[0];
    if (c.kind === 'json') return c.file === PROFILE_FILE ? 'Edit profile' : 'Edit projects';
    if (c.kind === 'delete-post') return `Delete post: ${c.slug}`;
    if (c.kind === 'upload') return 'Add image';
  }
  return 'Edit site content';
}
