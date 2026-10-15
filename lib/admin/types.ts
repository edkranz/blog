// Shared by the admin API routes and the in-OS editor. Keep this file import-free:
// Node's test runner loads it directly.

export const PROFILE_FILE = 'content/profile.json';
export const PROJECTS_FILE = 'content/projects.json';
export type JsonFile = typeof PROFILE_FILE | typeof PROJECTS_FILE;
export const JSON_FILES: readonly string[] = [PROFILE_FILE, PROJECTS_FILE];
export const POSTS_DIR = 'content/posts';

/** Vercel caps request bodies at 4.5 MB, so keep a single image comfortably under it. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export type PostDraft = {
  slug: string;
  title: string;
  date: string; // ISO
  excerpt: string;
  tags: string[];
  heroImg: string | null;
  hideFromBlogList: boolean;
  body: string; // markdown, trimmed
  /** Frontmatter keys the editor does not manage (e.g. `author`), written back untouched. */
  extra: Record<string, unknown>;
};

export type AdminPostMeta = Omit<PostDraft, 'body' | 'extra'> & { path: string; readingMinutes: number };

export type PendingChange =
  | { kind: 'json'; file: JsonFile; value: unknown }
  | { kind: 'post'; draft: PostDraft; path: string; isNew: boolean }
  | { kind: 'delete-post'; slug: string; path: string }
  | { kind: 'upload'; path: string; base64: string };

export type CommitRequest = { branch: string; head: string; message: string; changes: PendingChange[] };

export type FileChange = { path: string; content: string; encoding: 'utf-8' | 'base64' } | { path: string; delete: true };

export type AdminSnapshot = { branch: string; head: string; profile: unknown; projects: unknown[]; posts: AdminPostMeta[] };

export type AdminUser = { login: string; avatarUrl: string };
