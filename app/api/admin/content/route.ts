import { adminRoute, branchParam } from '@/lib/admin/server';
import { loadSnapshot } from '@/lib/admin/snapshot';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ url, backend }) => Response.json(await loadSnapshot(backend, branchParam(url))));
