import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InvalidChangeError, toFileChanges } from '../../lib/admin/changes.ts';
import { defaultMessage } from '../../lib/admin/messages.ts';
import type { PendingChange, PostDraft } from '../../lib/admin/types.ts';

const draft: PostDraft = { slug: 'hello', title: 'Hello', date: '2026-10-15T00:00:00.000Z', excerpt: '', tags: [], heroImg: null, hideFromBlogList: false, body: 'Hi', extra: {} };
const png = Buffer.from('fake').toString('base64');

test('converts each change kind to a file change', () => {
  const out = toFileChanges([
    { kind: 'json', file: 'content/profile.json', value: { a: 1 } },
    { kind: 'post', draft, path: 'content/posts/hello.mdx', isNew: true },
    { kind: 'delete-post', slug: 'old', path: 'content/posts/old.md' },
    { kind: 'upload', path: 'public/uploads/posts/hello/shot-1.png', base64: png },
  ]);
  assert.deepEqual(out[0], { path: 'content/profile.json', content: '{\n  "a": 1\n}\n', encoding: 'utf-8' });
  assert.equal(out[1].path, 'content/posts/hello.mdx');
  assert.deepEqual(out[2], { path: 'content/posts/old.md', delete: true });
  assert.deepEqual(out[3], { path: 'public/uploads/posts/hello/shot-1.png', content: png, encoding: 'base64' });
});

test('rejects hostile or malformed changes', () => {
  const bad: PendingChange[][] = [
    [],
    [{ kind: 'json', file: 'package.json' as never, value: {} }],
    [{ kind: 'json', file: 'content/projects.json', value: { not: 'an array' } }],
    [{ kind: 'json', file: 'content/profile.json', value: [] }],
    [{ kind: 'post', draft: { ...draft, slug: '../x' }, path: 'content/posts/../x.mdx', isNew: true }],
    [{ kind: 'post', draft, path: 'content/posts/../../package.json', isNew: false }],
    [{ kind: 'post', draft, path: 'content/posts/other.mdx', isNew: false }],
    [{ kind: 'delete-post', slug: 'x', path: '.github/workflows/x.yml' }],
    [{ kind: 'upload', path: '../.github/workflows/x.yml', base64: png }],
    [{ kind: 'upload', path: 'public/uploads/posts/a/b.sh', base64: png }],
    [{ kind: 'upload', path: 'public/uploads/posts/a/../../x.png', base64: png }],
    [{ kind: 'upload', path: 'public/uploads/posts/a/big.png', base64: 'A'.repeat(5_000_000) }],
    [{ kind: 'nope' } as never],
  ];
  for (const changes of bad) assert.throws(() => toFileChanges(changes), InvalidChangeError, JSON.stringify(changes).slice(0, 80));
});

test('default commit messages', () => {
  assert.equal(defaultMessage([{ kind: 'json', file: 'content/profile.json', value: {} }]), 'Edit profile');
  assert.equal(defaultMessage([{ kind: 'json', file: 'content/projects.json', value: [] }]), 'Edit projects');
  assert.equal(defaultMessage([{ kind: 'post', draft, path: 'content/posts/hello.mdx', isNew: true }]), 'Add post: Hello');
  assert.equal(defaultMessage([{ kind: 'post', draft, path: 'content/posts/hello.mdx', isNew: false }]), 'Edit post: Hello');
  assert.equal(defaultMessage([{ kind: 'delete-post', slug: 'old', path: 'content/posts/old.mdx' }]), 'Delete post: old');
  assert.equal(
    defaultMessage([
      { kind: 'post', draft, path: 'content/posts/hello.mdx', isNew: false },
      { kind: 'upload', path: 'public/uploads/posts/hello/a.png', base64: png },
    ]),
    'Edit post: Hello'
  );
  assert.equal(
    defaultMessage([
      { kind: 'json', file: 'content/profile.json', value: {} },
      { kind: 'json', file: 'content/projects.json', value: [] },
    ]),
    'Edit site content'
  );
});
