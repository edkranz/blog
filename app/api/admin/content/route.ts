import { parsePostFile } from '@/lib/admin/post-file';
import { byDateDesc, draftMeta } from '@/lib/admin/post-meta';
import { adminRoute, branchParam } from '@/lib/admin/server';
import { type AdminSnapshot, POSTS_DIR, PROFILE_FILE, PROJECTS_FILE } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ url, backend }) => {
  const branch = branchParam(url);
  const head = await backend.head(branch);
  const [profile, projects, names] = await Promise.all([backend.readFile(branch, PROFILE_FILE), backend.readFile(branch, PROJECTS_FILE), backend.listDir(branch, POSTS_DIR)]);
  const posts = await Promise.all(
    names
      .filter((n) => /\.mdx?$/.test(n))
      .map(async (name) => {
        const path = `${POSTS_DIR}/${name}`;
        return draftMeta(parsePostFile(name.replace(/\.mdx?$/, ''), (await backend.readFile(branch, path)) ?? ''), path);
      })
  );
  const snapshot: AdminSnapshot = { branch, head, profile: JSON.parse(profile ?? '{}'), projects: JSON.parse(projects ?? '[]'), posts: posts.sort(byDateDesc) };
  return Response.json(snapshot);
});
