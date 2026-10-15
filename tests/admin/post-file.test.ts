import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parsePostFile, serializePostFile } from '../../lib/admin/post-file.ts';
import { draftBranchName, isValidBranch, isValidSlug, slugify, tagLabel } from '../../lib/admin/post-meta.ts';

const raw = readFileSync(new URL('../../content/posts/introducing-eddie-os.mdx', import.meta.url), 'utf8');

test('parses the real post, normalising Tina tag refs and keeping unknown keys', () => {
  const d = parsePostFile('introducing-eddie-os', raw);
  assert.equal(d.title, 'Introducing Eddie OS');
  assert.equal(d.date, '2026-06-14T00:00:00.000Z');
  assert.deepEqual(d.tags, ['eddie-os', 'nextjs', 'design']);
  assert.equal(d.extra.author, 'content/authors/eddie.md');
  assert.ok(d.body.startsWith('i’ve been meaning'));
  assert.equal((d.body.match(/::sketch\{/g) ?? []).length, 3);
});

test('serialize then parse round-trips every field', () => {
  const d = parsePostFile('introducing-eddie-os', raw);
  const out = serializePostFile(d);
  assert.ok(out.startsWith('---\n'));
  assert.ok(out.endsWith('\n'));
  assert.deepEqual(parsePostFile('introducing-eddie-os', out), d);
});

test('hideFromBlogList is only written when true', () => {
  const d = { ...parsePostFile('x', raw), hideFromBlogList: false };
  assert.ok(!serializePostFile(d).includes('hideFromBlogList'));
  assert.ok(serializePostFile({ ...d, hideFromBlogList: true }).includes('hideFromBlogList: true'));
});

test('slug and branch helpers', () => {
  assert.equal(slugify('  Hello, World! Ünïcode  '), 'hello-world-unicode');
  assert.ok(isValidSlug('hello-world-2'));
  for (const bad of ['', '-a', 'a-', 'A', 'a/b', '../x', 'a..b']) assert.ok(!isValidSlug(bad), bad);
  assert.equal(draftBranchName('My Draft'), 'drafts/my-draft');
  assert.ok(isValidBranch('main') && isValidBranch('drafts/my-draft'));
  for (const bad of ['', '../main', 'a..b', 'a b', '/x', 'x/', 'refs/heads/x;rm']) assert.ok(!isValidBranch(bad), bad);
  assert.equal(tagLabel({ tag: 'content/tags/ai.mdx' }), 'ai');
  assert.equal(tagLabel('ai'), 'ai');
});
