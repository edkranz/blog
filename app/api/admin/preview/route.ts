import { adminRoute, branchParam } from '@/lib/admin/server';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ url, backend }) => Response.json({ url: await backend.previewUrl(branchParam(url)) }));
