import { BranchMovedError, type ContentBackend } from './backend.ts';
import type { FileChange } from './types.ts';

type Branch = { head: string; files: Map<string, string>; touched: Set<string> };

let counter = 0;
const nextSha = () => `fake${(++counter).toString(16).padStart(8, '0')}`;

export function createFakeBackend(seed: Record<string, string>): ContentBackend & { files(branch: string): Record<string, string> } {
  const branches = new Map<string, Branch>([['main', { head: nextSha(), files: new Map(Object.entries(seed)), touched: new Set() }]]);
  const get = (name: string): Branch => {
    const b = branches.get(name);
    if (!b) throw new Error(`no such branch: ${name}`);
    return b;
  };

  return {
    async listBranches() {
      return [...branches.keys()];
    },
    async head(name) {
      return get(name).head;
    },
    async readFile(name, path) {
      return get(name).files.get(path) ?? null;
    },
    async listDir(name, dir) {
      const prefix = `${dir}/`;
      return [...get(name).files.keys()].filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/')).map((p) => p.slice(prefix.length));
    },
    async createBranch(name, from) {
      if (branches.has(name)) throw new Error(`branch exists: ${name}`);
      const src = get(from);
      branches.set(name, { head: src.head, files: new Map(src.files), touched: new Set() });
    },
    async commit(name, expectedHead, _message, changes: FileChange[]) {
      const b = get(name);
      if (b.head !== expectedHead) throw new BranchMovedError();
      for (const c of changes) {
        if ('delete' in c) b.files.delete(c.path);
        else b.files.set(c.path, c.content);
        b.touched.add(c.path);
      }
      b.head = nextSha();
      return { sha: b.head };
    },
    async publish(name) {
      if (name === 'main') throw new Error('cannot publish main');
      const b = get(name);
      const main = get('main');
      for (const p of b.touched) {
        const v = b.files.get(p);
        if (v === undefined) main.files.delete(p);
        else main.files.set(p, v);
      }
      main.head = nextSha();
      branches.delete(name);
    },
    async previewUrl(name) {
      get(name);
      return name === 'main' ? null : `https://blog-git-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-edkranz.vercel.app`;
    },
    files(name) {
      return Object.fromEntries(get(name).files);
    },
  };
}
