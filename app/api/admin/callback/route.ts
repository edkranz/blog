import { adminConfig, isAllowed } from '@/lib/admin/config';
import { newSession, setSessionCookie } from '@/lib/admin/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cfg = adminConfig();
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get('eos_oauth_state')?.value;
  jar.set('eos_oauth_state', '', { path: '/api/admin', maxAge: 0 });
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || state !== expected) return new Response('Invalid OAuth state', { status: 400 });

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, code, redirect_uri: new URL('/api/admin/callback', url).toString() }),
    cache: 'no-store',
  });
  const { access_token: token } = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
  if (!token) return new Response('GitHub sign-in failed', { status: 502 });

  const userRes = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, cache: 'no-store' });
  const user = (await userRes.json().catch(() => ({}))) as { login?: string; avatar_url?: string };
  if (!user.login || !isAllowed(user.login, cfg)) return NextResponse.redirect(new URL('/admin?denied=1', url));

  await setSessionCookie(newSession(token, user.login, user.avatar_url ?? ''), req);
  return NextResponse.redirect(new URL('/admin', url));
}
