import { isValidBranch } from '@/lib/admin/post-meta';
import { BadRequestError, adminRoute } from '@/lib/admin/server';

export const dynamic = 'force-dynamic';

export const POST = adminRoute(async ({ req, backend }) => {
  const { branch } = (await req.json()) as { branch?: string };
  if (!branch || branch === 'main' || !isValidBranch(branch)) throw new BadRequestError('invalid branch');
  await backend.publish(branch, `Publish ${branch}`);
  return Response.json({ ok: true });
});
