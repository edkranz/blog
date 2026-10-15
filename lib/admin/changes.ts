import { serializePostFile } from './post-file.ts';
import { isValidSlug } from './post-meta.ts';
import { type FileChange, JSON_FILES, POSTS_DIR, PROJECTS_FILE, type PendingChange } from './types.ts';

/** Vercel caps request bodies at 4.5 MB, so keep a single image comfortably under it. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const UPLOAD_RE = /^public\/uploads\/posts\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:[-_.][a-z0-9]+)*\.(?:png|jpe?g|gif|webp|avif|svg)$/;

export class InvalidChangeError extends Error {
  name = 'InvalidChangeError';
}

function postPath(slug: string, path: string): string {
  if (!isValidSlug(slug)) throw new InvalidChangeError(`invalid slug: ${slug}`);
  if (path !== `${POSTS_DIR}/${slug}.mdx` && path !== `${POSTS_DIR}/${slug}.md`) throw new InvalidChangeError(`invalid post path: ${path}`);
  return path;
}

export function toFileChanges(changes: PendingChange[]): FileChange[] {
  if (!Array.isArray(changes) || changes.length === 0) throw new InvalidChangeError('nothing to commit');
  return changes.map((c): FileChange => {
    switch (c?.kind) {
      case 'json': {
        if (!JSON_FILES.includes(c.file)) throw new InvalidChangeError(`not editable: ${c.file}`);
        const isList = Array.isArray(c.value);
        if (c.file === PROJECTS_FILE ? !isList : isList || typeof c.value !== 'object' || c.value === null) throw new InvalidChangeError(`invalid value for ${c.file}`);
        return { path: c.file, content: `${JSON.stringify(c.value, null, 2)}\n`, encoding: 'utf-8' };
      }
      case 'post':
        return { path: postPath(c.draft?.slug, c.path), content: serializePostFile(c.draft), encoding: 'utf-8' };
      case 'delete-post':
        return { path: postPath(c.slug, c.path), delete: true };
      case 'upload':
        if (typeof c.path !== 'string' || !UPLOAD_RE.test(c.path)) throw new InvalidChangeError(`invalid upload path: ${c.path}`);
        if (typeof c.base64 !== 'string' || Math.floor((c.base64.length * 3) / 4) > MAX_UPLOAD_BYTES) throw new InvalidChangeError('image too large');
        return { path: c.path, content: c.base64, encoding: 'base64' };
      default:
        throw new InvalidChangeError('unknown change');
    }
  });
}
