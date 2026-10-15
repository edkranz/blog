import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BranchMovedError } from '../../lib/admin/backend.ts';
import { createFakeBackend } from '../../lib/admin/fake-backend.ts';

const seed = { 'content/profile.json': '{}', 'content/posts/a.mdx': 'A', 'content/posts/b.mdx': 'B', 'public/x.png': 'p' };

test('reads, lists and commits', async () => {
  const be = createFakeBackend(seed);
  assert.deepEqual((await be.listDir('main', 'content/posts')).sort(), ['a.mdx', 'b.mdx']);
  assert.equal(await be.readFile('main', 'missing'), null);
  const h = await be.head('main');
  const { sha } = await be.commit('main', h, 'm', [
    { path: 'content/posts/a.mdx', content: 'A2', encoding: 'utf-8' },
    { path: 'content/posts/b.mdx', delete: true },
  ]);
  assert.notEqual(sha, h);
  assert.equal(await be.head('main'), sha);
  assert.equal(await be.readFile('main', 'content/posts/a.mdx'), 'A2');
  assert.equal(await be.readFile('main', 'content/posts/b.mdx'), null);
});

test('stale head throws BranchMovedError and writes nothing', async () => {
  const be = createFakeBackend(seed);
  await assert.rejects(be.commit('main', 'stale', 'm', [{ path: 'content/posts/a.mdx', content: 'X', encoding: 'utf-8' }]), BranchMovedError);
  assert.equal(await be.readFile('main', 'content/posts/a.mdx'), 'A');
});

test('branch, commit, publish', async () => {
  const be = createFakeBackend(seed);
  await be.createBranch('drafts/x', 'main');
  await assert.rejects(be.createBranch('drafts/x', 'main'));
  await be.commit('drafts/x', await be.head('drafts/x'), 'm', [{ path: 'content/posts/a.mdx', content: 'Draft', encoding: 'utf-8' }]);
  assert.equal(await be.readFile('main', 'content/posts/a.mdx'), 'A');
  assert.match((await be.previewUrl('drafts/x')) ?? '', /^https:\/\//);
  await be.publish('drafts/x', 'Publish');
  assert.equal(await be.readFile('main', 'content/posts/a.mdx'), 'Draft');
  assert.deepEqual(await be.listBranches(), ['main']);
  await assert.rejects(be.publish('main', 'x'));
});
