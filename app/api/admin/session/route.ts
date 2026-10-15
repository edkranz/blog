import { getSession } from '@/lib/admin/server';
import type { AdminUser } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getSession();
  if (!s) return Response.json({ error: 'unauthorized' }, { status: 401 });
  return Response.json({ login: s.login, avatarUrl: s.avatarUrl } satisfies AdminUser);
}
