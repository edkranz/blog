import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createFakeBackend } from '../../lib/admin/fake-backend.ts';
import { editableBranches } from '../../lib/admin/post-meta.ts';
import { MissingContentError, loadSnapshot } from '../../lib/admin/snapshot.ts';

const post = readFileSync(new URL('../../content/posts/introducing-eddie-os.mdx', import.meta.url), 'utf8');

test('loadSnapshot reads profile, projects and post metadata', async () => {
  const be = createFakeBackend({ 'content/profile.json': '{"profile":{"name":"E"}}', 'content/projects.json': '[]', 'content/posts/introducing-eddie-os.mdx': post });
  const snap = await loadSnapshot(be, 'main');
  assert.equal(snap.branch, 'main');
  assert.deepEqual(snap.profile, { profile: { name: 'E' } });
  assert.deepEqual(
    snap.posts.map((p) => p.slug),
    ['introducing-eddie-os']
  );
});

test('a branch without the editable content files is refused, not half-loaded', async () => {
  const be = createFakeBackend({ 'content/projects.json': '[]' });
  await assert.rejects(loadSnapshot(be, 'main'), MissingContentError);
});

test('only main and drafts/* are offered as editable branches', () => {
  assert.deepEqual(editableBranches(['dependabot/npm/x', 'drafts/b', 'main', 'cursor/foo', 'drafts/a']), ['main', 'drafts/a', 'drafts/b']);
});
