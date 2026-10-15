import fs from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';
import { BranchMovedError, type ContentBackend, GitHubError, MergeConflictError } from './backend';
import { InvalidChangeError } from './changes';
import { adminConfig } from './config';
import { createFakeBackend } from './fake-backend';
import { createGithubBackend } from './github-backend';
import { isValidBranch } from './post-meta';
import { MissingContentError } from './snapshot';
import { SESSION_COOKIE, SESSION_TTL_S, type Session, seal, unseal } from './session';
import { POSTS_DIR, PROFILE_FILE, PROJECTS_FILE } from './types';

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

// Dev-only (the fake backend): ignored by output tracing so the admin functions don't bundle the whole repo.
function seedFromDisk(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const f of [PROFILE_FILE, PROJECTS_FILE]) files[f] = fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), f), 'utf8');
  const posts = path.join(/*turbopackIgnore: true*/ process.cwd(), POSTS_DIR);
  for (const f of fs.readdirSync(posts)) files[`${POSTS_DIR}/${f}`] = fs.readFileSync(path.join(/*turbopackIgnore: true*/ posts, f), 'utf8');
  return files;
}

// One fake per dev-server process, so edits survive between requests (and HMR).
const g = globalThis as { __eosFakeBackend?: ContentBackend };

function backendFor(session: Session): ContentBackend {
  const cfg = adminConfig();
  if (cfg.fake) {
    g.__eosFakeBackend ??= createFakeBackend(seedFromDisk());
    return g.__eosFakeBackend;
  }
  return createGithubBackend(session.token, cfg.repo);
}

export class BadRequestError extends Error {}

export function branchParam(url: URL, name = 'branch'): string {
  const b = url.searchParams.get(name) ?? 'main';
  if (!isValidBranch(b)) throw new BadRequestError(`invalid branch: ${b}`);
  return b;
}

type Ctx = { req: Request; url: URL; session: Session; backend: ContentBackend };

export function adminRoute(handler: (ctx: Ctx) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'GET' && !isSameOrigin(req)) return Response.json({ error: 'forbidden' }, { status: 403 });
    const session = await getSession();
    if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 });
    try {
      return await handler({ req, url: new URL(req.url), session, backend: backendFor(session) });
    } catch (e) {
      if (e instanceof BranchMovedError || e instanceof MergeConflictError) return Response.json({ error: e.message }, { status: 409 });
      if (e instanceof InvalidChangeError || e instanceof BadRequestError) return Response.json({ error: e.message }, { status: 400 });
      if (e instanceof MissingContentError) return Response.json({ error: e.message }, { status: 404 });
      if (e instanceof GitHubError && e.status === 401) return Response.json({ error: 'unauthorized' }, { status: 401 });
      console.error('[admin]', e);
      return Response.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 502 });
    }
  };
}
