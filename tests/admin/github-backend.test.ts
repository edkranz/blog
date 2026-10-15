import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BranchMovedError, MergeConflictError } from '../../lib/admin/backend.ts';
import { createGithubBackend } from '../../lib/admin/github-backend.ts';

type Call = { method: string; path: string; body?: unknown };
type Route = (call: Call) => Response | undefined;

function fakeFetch(routes: Route[]) {
  const calls: Call[] = [];
  const impl = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const call: Call = { method: init?.method ?? 'GET', path: url.pathname.replace('/repos/edkranz/blog', '') + url.search, body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    for (const r of routes) {
      const res = r(call);
      if (res) return res;
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
  return { impl, calls };
}

const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
const on =
  (method: string, path: string | RegExp, res: () => Response): Route =>
  (c) =>
    c.method === method && (typeof path === 'string' ? c.path === path : path.test(c.path)) ? res() : undefined;

const headRoute = (sha: string) => on('GET', '/git/ref/heads/drafts/x', () => json({ object: { sha } }));

test('commit builds blobs, a tree on the base tree, a commit, then a non-forced ref update', async () => {
  const { impl, calls } = fakeFetch([
    headRoute('h1'),
    on('GET', '/git/commits/h1', () => json({ tree: { sha: 't1' } })),
    on('POST', '/git/blobs', () => json({ sha: 'b1' })),
    on('POST', '/git/trees', () => json({ sha: 't2' })),
    on('POST', '/git/commits', () => json({ sha: 'c2' })),
    on('PATCH', '/git/refs/heads/drafts/x', () => json({})),
  ]);
  const be = createGithubBackend('tok', 'edkranz/blog', impl);
  const res = await be.commit('drafts/x', 'h1', 'msg', [
    { path: 'content/profile.json', content: '{}', encoding: 'utf-8' },
    { path: 'content/posts/old.mdx', delete: true },
  ]);
  assert.equal(res.sha, 'c2');
  const tree = calls.find((c) => c.path === '/git/trees')?.body as { base_tree: string; tree: { path: string; sha: string | null }[] };
  assert.equal(tree.base_tree, 't1');
  assert.deepEqual(
    tree.tree.map((t) => [t.path, t.sha]),
    [
      ['content/profile.json', 'b1'],
      ['content/posts/old.mdx', null],
    ]
  );
  assert.deepEqual(calls.find((c) => c.path === '/git/commits' && c.method === 'POST')?.body, { message: 'msg', tree: 't2', parents: ['h1'] });
  assert.deepEqual(calls.find((c) => c.method === 'PATCH')?.body, { sha: 'c2', force: false });
});

test('commit on a moved branch throws before writing anything', async () => {
  const { impl, calls } = fakeFetch([headRoute('h2')]);
  const be = createGithubBackend('tok', 'edkranz/blog', impl);
  await assert.rejects(be.commit('drafts/x', 'h1', 'm', [{ path: 'a', content: 'b', encoding: 'utf-8' }]), BranchMovedError);
  assert.ok(calls.every((c) => c.method === 'GET'));
});

test('a 422 on the ref update (race) is BranchMovedError', async () => {
  const { impl } = fakeFetch([
    headRoute('h1'),
    on('GET', '/git/commits/h1', () => json({ tree: { sha: 't1' } })),
    on('POST', '/git/blobs', () => json({ sha: 'b1' })),
    on('POST', '/git/trees', () => json({ sha: 't2' })),
    on('POST', '/git/commits', () => json({ sha: 'c2' })),
    on('PATCH', '/git/refs/heads/drafts/x', () => json({ message: 'Update is not a fast forward' }, 422)),
  ]);
  await assert.rejects(createGithubBackend('tok', 'edkranz/blog', impl).commit('drafts/x', 'h1', 'm', [{ path: 'a', content: 'b', encoding: 'utf-8' }]), BranchMovedError);
});

test('readFile returns null on 404 and raw text otherwise', async () => {
  const { impl, calls } = fakeFetch([on('GET', '/contents/content/profile.json?ref=main', () => new Response('{"a":1}'))]);
  const be = createGithubBackend('tok', 'edkranz/blog', impl);
  assert.equal(await be.readFile('main', 'content/profile.json'), '{"a":1}');
  assert.equal(await be.readFile('main', 'content/nope.json'), null);
  assert.ok(calls.length === 2);
});

test('publish opens a PR when none exists, squash-merges, deletes the branch', async () => {
  const { impl, calls } = fakeFetch([
    on('GET', /^\/pulls\?/, () => json([])),
    on('POST', '/pulls', () => json({ number: 7 })),
    on('PUT', '/pulls/7/merge', () => json({ merged: true })),
    on('DELETE', '/git/refs/heads/drafts/x', () => new Response(null, { status: 204 })),
  ]);
  await createGithubBackend('tok', 'edkranz/blog', impl).publish('drafts/x', 'Publish drafts/x');
  assert.deepEqual(calls.find((c) => c.method === 'POST')?.body, { title: 'Publish drafts/x', head: 'drafts/x', base: 'main', body: '' });
  assert.deepEqual(calls.find((c) => c.method === 'PUT')?.body, { merge_method: 'squash', commit_title: 'Publish drafts/x' });
  assert.ok(calls.some((c) => c.method === 'DELETE'));
});

test('publish maps a 405 merge refusal to MergeConflictError and keeps the branch', async () => {
  const { impl, calls } = fakeFetch([on('GET', /^\/pulls\?/, () => json([{ number: 3 }])), on('PUT', '/pulls/3/merge', () => json({}, 405))]);
  await assert.rejects(createGithubBackend('tok', 'edkranz/blog', impl).publish('drafts/x', 't'), MergeConflictError);
  assert.ok(!calls.some((c) => c.method === 'DELETE'));
});

test('previewUrl returns the first successful deployment for the branch head', async () => {
  const { impl } = fakeFetch([
    headRoute('h1'),
    on('GET', '/deployments?sha=h1&per_page=5', () => json([{ id: 1 }, { id: 2 }])),
    on('GET', '/deployments/1/statuses?per_page=1', () => json([{ state: 'pending' }])),
    on('GET', '/deployments/2/statuses?per_page=1', () => json([{ state: 'success', environment_url: 'https://p.vercel.app' }])),
  ]);
  assert.equal(await createGithubBackend('tok', 'edkranz/blog', impl).previewUrl('drafts/x'), 'https://p.vercel.app');
});
