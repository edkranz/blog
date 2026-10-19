import { isValidBranch } from '@/lib/admin/post-meta';
import { BadRequestError, adminRoute, branchParam } from '@/lib/admin/server';
import { PREVIEW_MESSAGE } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ url, backend }) => Response.json(await backend.preview(branchParam(url))));

/** Ask for a preview build of a draft: an empty marker commit on top of `head` (see scripts/vercel-ignore.sh). */
export const POST = adminRoute(async ({ req, backend }) => {
  const { branch, head } = (await req.json()) as { branch?: string; head?: string };
  if (!branch || branch === 'main' || !isValidBranch(branch)) throw new BadRequestError('invalid branch');
  if (!head || typeof head !== 'string') throw new BadRequestError('missing head');
  const { sha } = await backend.commit(branch, head, PREVIEW_MESSAGE, []);
  return Response.json({ head: sha });
});
