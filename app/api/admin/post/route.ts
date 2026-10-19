import { parsePostFile } from '@/lib/admin/post-file';
import { isValidSlug } from '@/lib/admin/post-meta';
import { BadRequestError, adminRoute, branchParam } from '@/lib/admin/server';
import { POSTS_DIR } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ url, backend }) => {
  const branch = branchParam(url);
  const slug = url.searchParams.get('slug') ?? '';
  if (!isValidSlug(slug)) throw new BadRequestError(`invalid slug: ${slug}`);
  for (const ext of ['mdx', 'md']) {
    const path = `${POSTS_DIR}/${slug}.${ext}`;
    const raw = await backend.readFile(branch, path);
    if (raw !== null) return Response.json({ draft: parsePostFile(slug, raw), path });
  }
  return Response.json({ error: 'not found' }, { status: 404 });
});
