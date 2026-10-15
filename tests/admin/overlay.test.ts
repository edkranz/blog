import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Remote, overlay, pendingKey } from '../../lib/admin/overlay.ts';
import type { PendingChange, PostDraft } from '../../lib/admin/types.ts';

const meta = (slug: string, date: string) => ({ slug, title: slug, date, excerpt: '', tags: [], heroImg: null, hideFromBlogList: false, path: `content/posts/${slug}.mdx`, readingMinutes: 1 });
const remote: Remote = { profile: { profile: { name: 'A' } }, projects: [{ id: 'p' }], posts: [meta('old', '2026-01-01'), meta('mid', '2026-05-01')] };
const draft: PostDraft = { slug: 'new', title: 'New', date: '2026-09-01', excerpt: '', tags: [], heroImg: null, hideFromBlogList: true, body: 'x', extra: {} };

test('overlay applies json, post and delete changes, newest post first', () => {
  const pending: Record<string, PendingChange> = {};
  for (const c of [
    { kind: 'json', file: 'content/profile.json', value: { profile: { name: 'B' } } },
    { kind: 'post', draft, path: 'content/posts/new.mdx', isNew: true },
    { kind: 'delete-post', slug: 'old', path: 'content/posts/old.mdx' },
  ] as PendingChange[])
    pending[pendingKey(c)] = c;
  const out = overlay(remote, pending);
  assert.deepEqual(out.profile, { profile: { name: 'B' } });
  assert.deepEqual(out.projects, remote.projects);
  assert.deepEqual(
    out.posts.map((p) => p.slug),
    ['new', 'mid']
  );
  assert.equal(out.posts[0].hideFromBlogList, true);
  assert.deepEqual(overlay(remote, {}), remote);
});

test('pendingKey is stable per target', () => {
  assert.equal(pendingKey({ kind: 'json', file: 'content/profile.json', value: 1 }), 'json:content/profile.json');
  assert.equal(pendingKey({ kind: 'post', draft, path: 'x', isNew: true }), 'post:new');
  assert.equal(pendingKey({ kind: 'delete-post', slug: 'new', path: 'x' }), 'post:new');
  assert.equal(pendingKey({ kind: 'upload', path: 'public/a.png', base64: '' }), 'upload:public/a.png');
});
