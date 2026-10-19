import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adminConfig, isAllowed } from '../../lib/admin/config.ts';
import { type Session, seal, unseal } from '../../lib/admin/session.ts';

const secret = 'x'.repeat(40);
const s: Session = { token: 'gho_abc', login: 'edkranz', avatarUrl: 'https://a/b.png', exp: Math.floor(Date.now() / 1000) + 60 };

test('seal/unseal round-trips', async () => {
  assert.deepEqual(await unseal(await seal(s, secret), secret), s);
});

test('unseal rejects tampering, wrong secret, expiry and junk', async () => {
  const v = await seal(s, secret);
  const [iv, ct] = v.split('.');
  // Flip a middle character: the last base64 char can carry only padding bits.
  const i = Math.floor(ct.length / 2);
  const flipped = `${iv}.${ct.slice(0, i)}${ct[i] === 'A' ? 'B' : 'A'}${ct.slice(i + 1)}`;
  assert.equal(await unseal(flipped, secret), null);
  assert.equal(await unseal(v, 'y'.repeat(40)), null);
  assert.equal(await unseal(await seal({ ...s, exp: 1 }, secret), secret), null);
  for (const junk of [undefined, '', 'abc', 'a.b.c', '..']) assert.equal(await unseal(junk, secret), null);
});

test('seal never contains the token in plain text', async () => {
  assert.ok(!(await seal(s, secret)).includes('gho_abc'));
});

test('fake mode is impossible in production', () => {
  assert.equal(adminConfig({ NODE_ENV: 'production', ADMIN_FAKE_GITHUB: '1' }).fake, false);
  assert.equal(adminConfig({ NODE_ENV: 'development', ADMIN_FAKE_GITHUB: '1' }).fake, true);
  assert.equal(adminConfig({ NODE_ENV: 'development' }).fake, false);
  assert.equal(adminConfig({ NODE_ENV: 'production' }).sessionSecret, '');
});

test('allowlist defaults to edkranz and ignores case', () => {
  const cfg = adminConfig({});
  assert.ok(isAllowed('EdKranz', cfg));
  assert.ok(!isAllowed('someone-else', cfg));
  const multi = adminConfig({ ADMIN_GITHUB_USERS: ' a , B ' });
  assert.ok(isAllowed('b', multi) && isAllowed('A', multi) && !isAllowed('edkranz', multi));
  assert.equal(cfg.repo, 'edkranz/blog');
});
