import { toFileChanges } from '@/lib/admin/changes';
import { defaultMessage } from '@/lib/admin/messages';
import { isValidBranch } from '@/lib/admin/post-meta';
import { BadRequestError, adminRoute } from '@/lib/admin/server';
import type { CommitRequest } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export const POST = adminRoute(async ({ req, backend }) => {
  const body = (await req.json()) as Partial<CommitRequest>;
  if (!body.branch || !isValidBranch(body.branch)) throw new BadRequestError('invalid branch');
  if (!body.head || typeof body.head !== 'string') throw new BadRequestError('missing head');
  const files = toFileChanges(body.changes ?? []);
  const message = (typeof body.message === 'string' && body.message.trim()) || defaultMessage(body.changes ?? []);
  const { sha } = await backend.commit(body.branch, body.head, message, files);
  return Response.json({ head: sha });
});
