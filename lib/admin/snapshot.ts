import type { ContentBackend } from './backend.ts';
import { parsePostFile } from './post-file.ts';
import { byDateDesc, draftMeta } from './post-meta.ts';
import { type AdminSnapshot, POSTS_DIR, PROFILE_FILE, PROJECTS_FILE } from './types.ts';

/** The branch has no editable content (it predates content/profile.json). */
export class MissingContentError extends Error {
  name = 'MissingContentError';
}

export async function loadSnapshot(backend: ContentBackend, branch: string): Promise<AdminSnapshot> {
  const head = await backend.head(branch);
  const [profile, projects, names] = await Promise.all([backend.readFile(branch, PROFILE_FILE), backend.readFile(branch, PROJECTS_FILE), backend.listDir(branch, POSTS_DIR)]);
  if (profile === null || projects === null) throw new MissingContentError(`${branch} has no ${profile === null ? PROFILE_FILE : PROJECTS_FILE}`);
  const posts = await Promise.all(
    names
      .filter((n) => /\.mdx?$/.test(n))
      .map(async (name) => {
        const path = `${POSTS_DIR}/${name}`;
        return draftMeta(parsePostFile(name.replace(/\.mdx?$/, ''), (await backend.readFile(branch, path)) ?? ''), path);
      })
  );
  return { branch, head, profile: JSON.parse(profile), projects: JSON.parse(projects), posts: posts.sort(byDateDesc) };
}
