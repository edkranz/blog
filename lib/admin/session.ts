// The admin session is the GitHub token sealed with AES-GCM into an httpOnly cookie,
// so the token never reaches client JS and needs no server-side store.

export type Session = { token: string; login: string; avatarUrl: string; exp: number };

export const SESSION_COOKIE = 'eos_admin';
export const SESSION_TTL_S = 7 * 24 * 60 * 60;

const enc = new TextEncoder();
const dec = new TextDecoder();

async function key(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function seal(s: Session, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(secret), enc.encode(JSON.stringify(s)));
  return `${Buffer.from(iv).toString('base64url')}.${Buffer.from(ct).toString('base64url')}`;
}

export async function unseal(value: string | undefined, secret: string, now = Date.now()): Promise<Session | null> {
  if (!value || !secret) return null;
  const parts = value.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(parts[0], 'base64url') }, await key(secret), Buffer.from(parts[1], 'base64url'));
    const s = JSON.parse(dec.decode(pt)) as Session;
    if (typeof s.token !== 'string' || typeof s.login !== 'string' || typeof s.exp !== 'number') return null;
    return s.exp * 1000 > now ? s : null;
  } catch {
    return null;
  }
}
