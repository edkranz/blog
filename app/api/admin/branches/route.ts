import { draftBranchName, isValidBranch } from '@/lib/admin/post-meta';
import { BadRequestError, adminRoute } from '@/lib/admin/server';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ backend }) => Response.json({ branches: (await backend.listBranches()).sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b))) }));

export const POST = adminRoute(async ({ req, backend }) => {
  const { name, from } = (await req.json()) as { name?: string; from?: string };
  const branch = draftBranchName(name ?? '');
  if (!from || !isValidBranch(from)) throw new BadRequestError('invalid source branch');
  if ((await backend.listBranches()).includes(branch)) throw new BadRequestError(`${branch} already exists`);
  await backend.createBranch(branch, from);
  return Response.json({ branch });
});
