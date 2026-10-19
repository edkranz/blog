import { clearSessionCookie, isSameOrigin } from '@/lib/admin/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return Response.json({ error: 'forbidden' }, { status: 403 });
  await clearSessionCookie();
  return new Response(null, { status: 204 });
}
