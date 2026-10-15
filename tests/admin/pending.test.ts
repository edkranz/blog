import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pruneUploads, rebaseJson, settlePending, uniqueUploadPath, uploadName } from '../../lib/admin/pending.ts';
import type { PendingChange, PostDraft } from '../../lib/admin/types.ts';

const draft = (slug: string, body: string): PostDraft => ({ slug, title: slug, date: '2026-10-15', excerpt: '', tags: [], heroImg: null, hideFromBlogList: false, body, extra: {} });

test('settlePending keeps changes staged while a save was in flight', () => {
  const a: PendingChange = { kind: 'json', file: 'content/profile.json', value: { v: 1 } };
  const b: PendingChange = { kind: 'json', file: 'content/projects.json', value: [] };
  const sent = { 'json:content/profile.json': a };
  const a2: PendingChange = { kind: 'json', file: 'content/profile.json', value: { v: 2 } };
  assert.deepEqual(settlePending({ 'json:content/profile.json': a }, sent), {});
  assert.deepEqual(settlePending({ 'json:content/profile.json': a2, 'json:content/projects.json': b }, sent), { 'json:content/profile.json': a2, 'json:content/projects.json': b });
});

test('rebaseJson replays my leaf edits onto the new upstream value', () => {
  const base = { profile: { blurb: 'old', location: 'Sydney' }, hobbies: ['a', 'b'] };
  const mine = { profile: { blurb: 'mine', location: 'Sydney' }, hobbies: ['a', 'b'] };
  const next = { profile: { blurb: 'old', location: 'Melbourne' }, hobbies: ['a', 'b', 'c'] };
  assert.deepEqual(rebaseJson(base, mine, next), { profile: { blurb: 'mine', location: 'Melbourne' }, hobbies: ['a', 'b', 'c'] });
  assert.deepEqual(rebaseJson(base, base, next), next);
  // Same-length arrays merge per item; a structural change of mine wins as a whole.
  assert.deepEqual(rebaseJson(['a', 'b'], ['x', 'b'], ['a', 'y']), ['x', 'y']);
  assert.deepEqual(rebaseJson(['a', 'b'], ['a'], ['a', 'y']), ['a']);
});

test('uploadName and uniqueUploadPath never collide with a staged or referenced image', () => {
  assert.equal(uploadName('My Photo (1).PNG'), 'my-photo-1.png');
  assert.equal(uploadName('a..b.jpg'), 'a.b.jpg');
  const taken = ['public/uploads/posts/p/image.png', 'public/uploads/posts/p/image-2.png'];
  assert.equal(uniqueUploadPath('p', 'image.png', taken), 'public/uploads/posts/p/image-3.png');
  assert.equal(uniqueUploadPath('p', 'other.png', taken), 'public/uploads/posts/p/other.png');
});

test('pruneUploads drops images no staged post body references', () => {
  const pending: Record<string, PendingChange> = {
    'post:p': { kind: 'post', draft: draft('p', '![x](/uploads/posts/p/keep.png)'), path: 'content/posts/p.mdx', isNew: true },
    'upload:public/uploads/posts/p/keep.png': { kind: 'upload', path: 'public/uploads/posts/p/keep.png', base64: 'AA==' },
    'upload:public/uploads/posts/p/gone.png': { kind: 'upload', path: 'public/uploads/posts/p/gone.png', base64: 'AA==' },
  };
  assert.deepEqual(Object.keys(pruneUploads(pending)).sort(), ['post:p', 'upload:public/uploads/posts/p/keep.png']);
});
