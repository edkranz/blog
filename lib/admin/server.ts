import { cookies } from 'next/headers';
import { adminConfig } from './config';
import { SESSION_COOKIE, SESSION_TTL_S, type Session, seal, unseal } from './session';

export async function getSession(): Promise<Session | null> {
  return unseal((await cookies()).get(SESSION_COOKIE)?.value, adminConfig().sessionSecret);
}

export async function setSessionCookie(s: Session, req: Request): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await seal(s, adminConfig().sessionSecret), {
    httpOnly: true,
    secure: new URL(req.url).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_S,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Mutations must come from this site: compare the Origin header with the host serving the request. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function newSession(token: string, login: string, avatarUrl: string): Session {
  return { token, login, avatarUrl, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S };
}
