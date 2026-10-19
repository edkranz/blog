export type AdminConfig = {
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
  allowedUsers: string[];
  /** In-memory GitHub stand-in for local E2E. Never on in production. */
  fake: boolean;
  repo: string;
};

const FAKE_SECRET = 'eddie-os-fake-admin-session-secret-dev-only';

export function adminConfig(env: Record<string, string | undefined> = process.env): AdminConfig {
  const fake = env.ADMIN_FAKE_GITHUB === '1' && env.NODE_ENV !== 'production';
  return {
    clientId: env.GITHUB_CLIENT_ID ?? '',
    clientSecret: env.GITHUB_CLIENT_SECRET ?? '',
    sessionSecret: env.ADMIN_SESSION_SECRET ?? (fake ? FAKE_SECRET : ''),
    allowedUsers: (env.ADMIN_GITHUB_USERS ?? 'edkranz')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    fake,
    repo: env.ADMIN_REPO ?? 'edkranz/blog',
  };
}

export function isAllowed(login: string, cfg: AdminConfig): boolean {
  return cfg.allowedUsers.includes(login.toLowerCase());
}
