import type { AdminPostMeta, PostDraft } from './types.ts';

/** Tina stored tags as { tag: 'content/tags/ai.mdx' }; normalise to "ai". */
export function tagLabel(raw: unknown): string {
  const value = typeof raw === 'string' ? raw : ((raw as { tag?: string })?.tag ?? '');
  const base = value.split('/').pop() ?? value;
  return base.replace(/\.mdx?$/, '');
}

export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

export function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

export function isValidBranch(s: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/.test(s) && !s.includes('..') && !s.endsWith('.lock');
}

/** The branches /admin can edit: main and drafts it created. Older branches predate content/profile.json. */
export function editableBranches(names: string[]): string[] {
  return [...(names.includes('main') ? ['main'] : []), ...names.filter((n) => n.startsWith('drafts/')).sort()];
}

export function draftBranchName(input: string): string {
  return `drafts/${slugify(input) || 'draft'}`;
}

export function draftMeta(d: PostDraft, path: string): AdminPostMeta {
  return {
    slug: d.slug,
    title: d.title,
    date: d.date,
    excerpt: d.excerpt,
    tags: d.tags,
    heroImg: d.heroImg,
    hideFromBlogList: d.hideFromBlogList,
    path,
    readingMinutes: readingMinutes(d.body),
  };
}

export function byDateDesc(a: { date: string }, b: { date: string }): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}
