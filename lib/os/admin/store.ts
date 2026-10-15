'use client';

import { appendAt, removeAt, setPath } from '@/lib/admin/json-path';
import { pruneUploads, rebaseJson, settlePending } from '@/lib/admin/pending';
import { type Remote, overlay, pendingKey } from '@/lib/admin/overlay';
import { type AdminPostMeta, type AdminSnapshot, type AdminUser, type JsonFile, PROFILE_FILE, type PendingChange, type PostDraft } from '@/lib/admin/types';
import { create } from 'zustand';
import { confirmAction } from './dialog-store';

type Busy = null | 'loading' | 'saving' | 'publishing';
type LoadedPost = { draft: PostDraft; path: string };

export type AdminState = {
  enabled: boolean;
  session: AdminUser | null | undefined; // undefined while checking
  branch: string;
  head: string | null;
  branches: string[];
  remote: Remote | null;
  pending: Record<string, PendingChange>;
  drafts: Record<string, LoadedPost>;
  busy: Busy;
  error: string | null;

  init: () => Promise<void>;
  load: (branch: string) => Promise<void>;
  editJson: (file: JsonFile, path: string, value: unknown) => void;
  removeJsonItem: (file: JsonFile, path: string) => void;
  appendJsonItem: (file: JsonFile, path: string, value: unknown) => void;
  loadPost: (slug: string) => Promise<LoadedPost | null>;
  stagePost: (draft: PostDraft, path: string, isNew: boolean, prevSlug?: string) => void;
  /** Drop a new, never-saved post this editor staged (its slug became invalid or taken). */
  unstagePost: (slug: string) => void;
  deletePost: (meta: AdminPostMeta) => void;
  stageUpload: (path: string, base64: string) => void;
  discard: () => void;
  save: (message: string) => Promise<boolean>;
  createBranch: (name: string) => Promise<void>;
  publish: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const isEditing = (s: AdminState) => s.enabled && !!s.session && !!s.remote;

const BRANCH_KEY = 'eos-admin-branch';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401) useAdminStore.setState({ session: null });
  if (!res.ok) throw new ApiError(res.status, data.error ?? (res.status === 413 ? 'too large' : `HTTP ${res.status}`));
  return data;
}

const message = (e: unknown) => (e instanceof Error ? e.message : 'failed');

function jsonValue(s: AdminState, file: JsonFile): unknown {
  const p = s.pending[`json:${file}`];
  if (p?.kind === 'json') return p.value;
  return file === PROFILE_FILE ? s.remote?.profile : s.remote?.projects;
}

export const useAdminStore = create<AdminState>((set, get) => {
  const stageJson = (file: JsonFile, value: unknown) => set((s) => ({ pending: { ...s.pending, [`json:${file}`]: { kind: 'json', file, value } } }));

  return {
    enabled: false,
    session: undefined,
    branch: 'main',
    head: null,
    branches: ['main'],
    remote: null,
    pending: {},
    drafts: {},
    busy: null,
    error: null,

    init: async () => {
      set({ enabled: true });
      try {
        const session = await api<AdminUser>('session');
        set({ session });
        let branch = 'main';
        try {
          branch = sessionStorage.getItem(BRANCH_KEY) ?? 'main';
        } catch {}
        await get()
          .load(branch)
          .catch(() => get().load('main'));
      } catch {
        set({ session: null });
      }
    },

    load: async (branch) => {
      const before = get();
      set({ busy: 'loading', error: null });
      try {
        const [snap, list] = await Promise.all([api<AdminSnapshot>(`content?branch=${encodeURIComponent(branch)}`), api<{ branches: string[] }>('branches')]);
        // Reloading the same branch (e.g. after "branch moved") keeps pending edits: rebase them onto what is there now.
        const pending = branch === before.branch && before.remote ? await rebasePending(before, snap) : get().pending;
        set({ branch: snap.branch, head: snap.head, remote: { profile: snap.profile, projects: snap.projects, posts: snap.posts }, branches: list.branches, drafts: {}, pending });
        try {
          sessionStorage.setItem(BRANCH_KEY, snap.branch);
        } catch {}
      } catch (e) {
        set({ error: `Load failed: ${message(e)}` });
        throw e;
      } finally {
        set({ busy: null });
      }
    },

    editJson: (file, path, value) => stageJson(file, setPath(jsonValue(get(), file), path, value)),
    removeJsonItem: (file, path) => stageJson(file, removeAt(jsonValue(get(), file), path)),
    appendJsonItem: (file, path, value) => stageJson(file, appendAt(jsonValue(get(), file), path, value)),

    loadPost: async (slug) => {
      const s = get();
      const staged = s.pending[`post:${slug}`];
      if (staged?.kind === 'post') return { draft: staged.draft, path: staged.path };
      if (s.drafts[slug]) return s.drafts[slug];
      try {
        const loaded = await api<LoadedPost>(`post?branch=${encodeURIComponent(s.branch)}&slug=${encodeURIComponent(slug)}`);
        set((st) => ({ drafts: { ...st.drafts, [slug]: loaded } }));
        return loaded;
      } catch (e) {
        set({ error: `Open failed: ${message(e)}` });
        return null;
      }
    },

    stagePost: (draft, path, isNew, prevSlug) =>
      set((s) => {
        const pending = { ...s.pending };
        if (prevSlug && prevSlug !== draft.slug) delete pending[`post:${prevSlug}`];
        const change: PendingChange = { kind: 'post', draft, path, isNew };
        pending[pendingKey(change)] = change;
        return { pending };
      }),

    unstagePost: (slug) =>
      set((s) => {
        const staged = s.pending[`post:${slug}`];
        if (staged?.kind !== 'post' || !staged.isNew) return s;
        const pending = { ...s.pending };
        delete pending[`post:${slug}`];
        return { pending };
      }),

    deletePost: (meta) =>
      set((s) => {
        const pending = { ...s.pending };
        const staged = pending[`post:${meta.slug}`];
        // Deleting a post that only exists as an unsaved draft just drops the draft.
        if (staged?.kind === 'post' && staged.isNew) delete pending[`post:${meta.slug}`];
        else pending[`post:${meta.slug}`] = { kind: 'delete-post', slug: meta.slug, path: meta.path };
        return { pending };
      }),

    stageUpload: (path, base64) => set((s) => ({ pending: { ...s.pending, [`upload:${path}`]: { kind: 'upload', path, base64 } } })),

    discard: () => set({ pending: {}, error: null }),

    save: async (msg) => {
      const s = get();
      const sent = pruneUploads(s.pending);
      const changes = Object.values(sent);
      if (!s.head || changes.length === 0 || !s.remote) return false;
      set({ busy: 'saving', error: null });
      try {
        const res = await api<{ head: string }>('commit', { branch: s.branch, head: s.head, message: msg, changes });
        const drafts = { ...s.drafts };
        for (const c of changes) {
          if (c.kind === 'post') drafts[c.draft.slug] = { draft: c.draft, path: c.path };
          if (c.kind === 'delete-post') delete drafts[c.slug];
        }
        // Keep edits staged while the commit was in flight; unreferenced images are dropped with the save.
        set((st) => ({ head: res.head, remote: overlay(s.remote as Remote, sent), pending: settlePending(st.pending, s.pending), drafts }));
        return true;
      } catch (e) {
        set({ error: `Save failed: ${message(e)}` });
        return false;
      } finally {
        set({ busy: null });
      }
    },

    createBranch: async (name) => {
      set({ error: null });
      try {
        const { branch } = await api<{ branch: string }>('branches', { name, from: get().branch });
        await get().load(branch); // pending edits carry over to the new branch
      } catch (e) {
        set({ error: `Branch failed: ${message(e)}` });
      }
    },

    publish: async () => {
      const { branch } = get();
      set({ busy: 'publishing', error: null });
      try {
        await api('publish', { branch });
        await get().load('main');
      } catch (e) {
        set({ error: `Publish failed: ${message(e)}` });
      } finally {
        set({ busy: null });
      }
    },

    signOut: async () => {
      await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
      set({ session: null, remote: null });
    },
  };
});

/**
 * Pending edits were made against `before.remote`; the branch is now at `snap`. JSON edits are replayed leaf by leaf.
 * Posts edited upstream meanwhile cannot be merged, so ask before keeping our version.
 */
async function rebasePending(before: AdminState, snap: AdminSnapshot): Promise<Record<string, PendingChange>> {
  const old = before.remote as Remote;
  const out: Record<string, PendingChange> = {};
  const conflicts: string[] = [];
  for (const [k, c] of Object.entries(useAdminStore.getState().pending)) {
    if (c.kind === 'json') {
      const base = c.file === PROFILE_FILE ? old.profile : old.projects;
      const next = c.file === PROFILE_FILE ? snap.profile : snap.projects;
      out[k] = { ...c, value: rebaseJson(base, c.value, next) };
      continue;
    }
    out[k] = c;
    if (c.kind === 'post' && !c.isNew) {
      const base = before.drafts[c.draft.slug]?.draft;
      const now = await api<{ draft: PostDraft }>(`post?branch=${encodeURIComponent(snap.branch)}&slug=${encodeURIComponent(c.draft.slug)}`).catch(() => null);
      if (!base || !now || JSON.stringify(base) !== JSON.stringify(now.draft)) conflicts.push(c.draft.slug);
    }
  }
  if (conflicts.length && !(await confirmAction(`${conflicts.join(', ')} changed on ${snap.branch}. Keep your version?`, 'Keep Mine'))) {
    for (const slug of conflicts) delete out[`post:${slug}`];
  }
  return out;
}

