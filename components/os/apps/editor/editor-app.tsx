'use client';

import { uniqueUploadPath, uploadName } from '@/lib/admin/pending';
import { isValidSlug, slugify } from '@/lib/admin/post-meta';
import { type AdminPostMeta, MAX_UPLOAD_BYTES, POSTS_DIR, type PostDraft } from '@/lib/admin/types';
import { profile } from '@/lib/eddie';
import { isEditing, useAdminStore } from '@/lib/os/admin/store';
import { useWindowStore } from '@/lib/os/store';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppScroll } from '../../ui';
import type { AppContentProps } from '../types';

const MarkdownEditor = dynamic(() => import('./markdown-editor'), {
  ssr: false,
  loading: () => <div className='py-10 text-center text-sm text-muted-foreground'>Loading…</div>,
});

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif)$/;
const NO_POSTS: AdminPostMeta[] = [];

const newDraft = (): PostDraft => ({ slug: '', title: '', date: new Date().toISOString(), excerpt: '', tags: [], heroImg: null, hideFromBlogList: false, body: '', extra: {} });

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

const field = 'w-full rounded-lg border bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-primary';
const label = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

export function EditorApp({ win }: AppContentProps) {
  const editing = useAdminStore(isEditing);
  const branch = useAdminStore((s) => s.branch);
  // Select the array itself (a fresh `?? []` inside the selector would re-render forever).
  const existing = useAdminStore((s) => s.remote?.posts) ?? NO_POSTS;
  const { resolvedTheme } = useTheme();
  const updateProps = useWindowStore((s) => s.updateProps);
  const initialSlug = typeof win.props?.slug === 'string' ? (win.props.slug as string) : null;

  const [isNew] = useState(initialSlug === null);
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [original, setOriginal] = useState('');
  const [path, setPath] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [missing, setMissing] = useState(false);
  // The branch the draft was loaded from: keys the editor so a branch switch remounts it with that branch's body.
  const [loadedBranch, setLoadedBranch] = useState<string | null>(null);
  // The slug this editor last staged a new post under (not the draft's last slug, which may be invalid or taken).
  const stagedSlug = useRef<string | null>(null);
  const previews = useRef(new Map<string, string>());
  const draftRef = useRef<PostDraft | null>(null);
  draftRef.current = draft;

  // Loads the post, and reloads it from the new branch whenever the branch changes underneath the window.
  const slugToLoad = isNew ? null : (draft?.slug ?? initialSlug);
  useEffect(() => {
    if (!editing) return;
    if (!slugToLoad) {
      if (!draftRef.current) setDraft(newDraft());
      setLoadedBranch(branch);
      return;
    }
    let cancelled = false;
    setDraft(null);
    useAdminStore
      .getState()
      .loadPost(slugToLoad)
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) return setMissing(true);
        setDraft(loaded.draft);
        setOriginal(loaded.draft.body);
        setPath(loaded.path);
        setLoadedBranch(branch);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, branch]);

  // A new post stops being "fresh" once the file this editor staged has been saved: its slug is then fixed.
  // (Matching on `path` alone would let a colliding title adopt, and overwrite, someone else's post.)
  const [ownPath, setOwnPath] = useState<string | null>(null);
  const fresh = isNew && !(ownPath !== null && existing.some((p) => p.path === ownPath));
  const slugTaken = (slug: string) => fresh && existing.some((p) => p.slug === slug);

  const update = useCallback(
    (patch: Partial<PostDraft>) => {
      const prev = draftRef.current;
      if (!prev) return;
      const next = { ...prev, ...patch };
      if (fresh && !slugTouched && patch.title !== undefined) next.slug = slugify(patch.title);
      const nextPath = fresh ? `${POSTS_DIR}/${next.slug}.mdx` : path;
      setDraft(next);
      if (fresh) setPath(nextPath);
      updateProps(win.id, { slug: fresh ? null : next.slug }, next.title || 'Untitled');
      const store = useAdminStore.getState();
      if (isValidSlug(next.slug) && !slugTaken(next.slug)) {
        store.stagePost(next, nextPath, fresh, fresh ? (stagedSlug.current ?? undefined) : undefined);
        if (fresh) {
          stagedSlug.current = next.slug;
          setOwnPath(nextPath);
        }
      } else if (fresh && stagedSlug.current) {
        // The slug went invalid or collided: withdraw this editor's earlier draft rather than leave an orphan.
        store.unstagePost(stagedSlug.current);
        stagedSlug.current = null;
        setOwnPath(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fresh, slugTouched, path, win.id, existing]
  );

  const uploadImage = useCallback(async (file: File) => {
    const d = draftRef.current;
    const name = uploadName(file.name);
    if (!d || !isValidSlug(d.slug)) throw new Error('title required');
    if (!IMAGE_EXT.test(name)) throw new Error('unsupported image');
    if (file.size > MAX_UPLOAD_BYTES) throw new Error('image too large');
    // Pasted images are all "image.png": never reuse a name already staged or used in this post.
    const store = useAdminStore.getState();
    const taken = [...Object.keys(store.pending).map((k) => k.replace(/^upload:/, '')), ...(d.body.match(/\/uploads\/posts\/[^\s)"']+/g) ?? []).map((src) => `public${src}`)];
    const repoPath = uniqueUploadPath(d.slug, name, taken);
    store.stageUpload(repoPath, await fileToBase64(file));
    const src = repoPath.slice('public'.length);
    previews.current.set(src, URL.createObjectURL(file));
    return src;
  }, []);

  const previewImage = useCallback(
    async (src: string) => {
      const local = previews.current.get(src);
      if (local) return local;
      if (src.startsWith('/uploads/') && branch !== 'main') return `https://raw.githubusercontent.com/${profile.repo}/${branch}/public${src}`;
      return src;
    },
    [branch]
  );

  // Once a new post is saved its window answers to the slug, so opening the post from Blog focuses it.
  useEffect(() => {
    if (isNew && !fresh && draft?.slug) updateProps(win.id, { slug: draft.slug });
  }, [isNew, fresh, draft?.slug, updateProps, win.id]);

  if (!editing) return null;
  if (missing) return <div className='grid h-full place-items-center text-sm text-muted-foreground'>No such post.</div>;
  if (!draft) return <div className='grid h-full place-items-center text-sm text-muted-foreground'>Loading…</div>;

  const slugError = fresh && draft.slug !== '' && (!isValidSlug(draft.slug) || slugTaken(draft.slug));

  return (
    <AppScroll className='bg-card'>
      <div className='mx-auto max-w-3xl px-6 py-5'>
        <input
          aria-label='Title'
          value={draft.title}
          placeholder='Untitled'
          onChange={(e) => update({ title: e.target.value })}
          className='w-full bg-transparent text-[28px] font-bold leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50'
        />
        <div className='mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]'>
          <label className='block'>
            <span className={label}>Slug</span>
            <input
              aria-label='Slug'
              value={draft.slug}
              readOnly={!fresh}
              onChange={(e) => {
                setSlugTouched(true);
                update({ slug: e.target.value });
              }}
              className={cn(field, !fresh && 'text-muted-foreground', slugError && 'border-destructive')}
            />
          </label>
          <label className='block'>
            <span className={label}>Date</span>
            <input
              aria-label='Date'
              type='date'
              value={draft.date.slice(0, 10)}
              onChange={(e) => e.target.value && update({ date: new Date(`${e.target.value}T00:00:00.000Z`).toISOString() })}
              className={field}
            />
          </label>
          <label className='flex items-end gap-2 pb-1.5 text-[13px]'>
            <input type='checkbox' checked={draft.hideFromBlogList} onChange={(e) => update({ hideFromBlogList: e.target.checked })} />
            Hidden
          </label>
        </div>
        <label className='mt-3 block'>
          <span className={label}>Excerpt</span>
          <textarea aria-label='Excerpt' rows={2} value={draft.excerpt} onChange={(e) => update({ excerpt: e.target.value })} className={cn(field, 'resize-none')} />
        </label>
        <div className='mt-3 grid gap-3 sm:grid-cols-2'>
          <label className='block'>
            <span className={label}>Tags</span>
            <input
              aria-label='Tags'
              defaultValue={draft.tags.join(', ')}
              onBlur={(e) =>
                update({
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              className={field}
            />
          </label>
          <label className='block'>
            <span className={label}>Hero image</span>
            <input aria-label='Hero image' value={draft.heroImg ?? ''} onChange={(e) => update({ heroImg: e.target.value || null })} className={field} />
          </label>
        </div>
        <div className='mt-5 overflow-hidden rounded-xl border'>
          <MarkdownEditor
            key={`${loadedBranch}:${initialSlug ?? 'new'}`}
            markdown={draft.body}
            original={original}
            dark={resolvedTheme === 'dark'}
            onChange={(body) => update({ body })}
            uploadImage={uploadImage}
            previewImage={previewImage}
          />
        </div>
      </div>
    </AppScroll>
  );
}
