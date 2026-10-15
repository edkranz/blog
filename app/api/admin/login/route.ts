import { adminConfig } from '@/lib/admin/config';
import { newSession, setSessionCookie } from '@/lib/admin/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cfg = adminConfig();
  const url = new URL(req.url);
  if (cfg.fake) {
    await setSessionCookie(newSession('fake', cfg.allowedUsers[0] ?? 'edkranz', '/uploads/authors/eddie.jpg'), req);
    return NextResponse.redirect(new URL('/admin', url));
  }
  if (!cfg.clientId || !cfg.sessionSecret) return new Response('Admin is not configured', { status: 500 });
  const state = crypto.randomUUID();
  (await cookies()).set('eos_oauth_state', state, { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/api/admin', maxAge: 600 });
  const gh = new URL('https://github.com/login/oauth/authorize');
  gh.searchParams.set('client_id', cfg.clientId);
  gh.searchParams.set('redirect_uri', new URL('/api/admin/callback', url).toString());
  gh.searchParams.set('scope', 'public_repo');
  gh.searchParams.set('state', state);
  gh.searchParams.set('allow_signup', 'false');
  return NextResponse.redirect(gh);
}
