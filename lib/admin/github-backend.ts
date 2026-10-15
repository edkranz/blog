import { BranchMovedError, type ContentBackend, GitHubError, MergeConflictError } from './backend.ts';
import type { FileChange } from './types.ts';

const encPath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

export function createGithubBackend(token: string, repo: string, fetchImpl: typeof fetch = fetch): ContentBackend {
  const call = (path: string, init: { method?: string; body?: unknown; accept?: string } = {}) =>
    fetchImpl(`https://api.github.com/repos/${repo}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: init.accept ?? 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });

  const json = async <T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
    const res = await call(path, init);
    if (!res.ok) throw new GitHubError(res.status, `${init.method ?? 'GET'} ${path}: ${res.status}`);
    return (await res.json()) as T;
  };

  const head = async (branch: string) => (await json<{ object: { sha: string } }>(`/git/ref/heads/${encPath(branch)}`)).object.sha;

  const readFile = async (branch: string, path: string) => {
    const res = await call(`/contents/${encPath(path)}?ref=${encodeURIComponent(branch)}`, { accept: 'application/vnd.github.raw+json' });
    if (res.status === 404) return null;
    if (!res.ok) throw new GitHubError(res.status, `read ${path}: ${res.status}`);
    return res.text();
  };

  const listDir = async (branch: string, dir: string) => {
    const res = await call(`/contents/${encPath(dir)}?ref=${encodeURIComponent(branch)}`);
    if (res.status === 404) return [];
    if (!res.ok) throw new GitHubError(res.status, `list ${dir}: ${res.status}`);
    return ((await res.json()) as { name: string; type: string }[]).filter((e) => e.type === 'file').map((e) => e.name);
  };

  const commit = async (branch: string, expectedHead: string, message: string, changes: FileChange[]) => {
    if ((await head(branch)) !== expectedHead) throw new BranchMovedError();
    const base = await json<{ tree: { sha: string } }>(`/git/commits/${expectedHead}`);
    const tree: { path: string; mode: string; type: string; sha: string | null }[] = [];
    // Sequential, not Promise.all: stays inside GitHub's secondary rate limits.
    for (const c of changes) {
      if ('delete' in c) {
        tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const blob = await json<{ sha: string }>('/git/blobs', { method: 'POST', body: { content: c.content, encoding: c.encoding } });
      tree.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const newTree = await json<{ sha: string }>('/git/trees', { method: 'POST', body: { base_tree: base.tree.sha, tree } });
    const created = await json<{ sha: string }>('/git/commits', { method: 'POST', body: { message, tree: newTree.sha, parents: [expectedHead] } });
    const res = await call(`/git/refs/heads/${encPath(branch)}`, { method: 'PATCH', body: { sha: created.sha, force: false } });
    if (res.status === 422) throw new BranchMovedError();
    if (!res.ok) throw new GitHubError(res.status, `update ${branch}: ${res.status}`);
    return { sha: created.sha };
  };

  const publish = async (branch: string, title: string) => {
    if (branch === 'main') throw new Error('cannot publish main');
    const owner = repo.split('/')[0];
    const open = await json<{ number: number }[]>(`/pulls?state=open&base=main&head=${encodeURIComponent(`${owner}:${branch}`)}`);
    const pr = open[0] ?? (await json<{ number: number }>('/pulls', { method: 'POST', body: { title, head: branch, base: 'main', body: '' } }));
    const merged = await call(`/pulls/${pr.number}/merge`, { method: 'PUT', body: { merge_method: 'squash', commit_title: title } });
    if (merged.status === 405 || merged.status === 409) throw new MergeConflictError();
    if (!merged.ok) throw new GitHubError(merged.status, `merge: ${merged.status}`);
    await call(`/git/refs/heads/${encPath(branch)}`, { method: 'DELETE' });
  };

  const previewUrl = async (branch: string) => {
    const sha = await head(branch);
    const deployments = await json<{ id: number }[]>(`/deployments?sha=${sha}&per_page=5`);
    for (const d of deployments) {
      const [status] = await json<{ state: string; environment_url?: string }[]>(`/deployments/${d.id}/statuses?per_page=1`);
      if (status?.state === 'success' && status.environment_url) return status.environment_url;
    }
    return null;
  };

  return {
    listBranches: async () => (await json<{ name: string }[]>('/branches?per_page=100')).map((b) => b.name),
    head,
    readFile,
    listDir,
    createBranch: async (name, from) => {
      await json('/git/refs', { method: 'POST', body: { ref: `refs/heads/${name}`, sha: await head(from) } });
    },
    commit,
    publish,
    previewUrl,
  };
}
