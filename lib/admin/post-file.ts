import matter from 'gray-matter';
import { tagLabel } from './post-meta.ts';
import type { PostDraft } from './types.ts';

const MANAGED = new Set(['title', 'date', 'excerpt', 'tags', 'heroImg', 'hideFromBlogList']);

export function parsePostFile(slug: string, raw: string): PostDraft {
  // gray-matter caches by input string and returns a shared object; copy before use.
  const { data, content } = matter(raw);
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (!MANAGED.has(k)) extra[k] = v;
  return {
    slug,
    title: typeof data.title === 'string' ? data.title : slug,
    date: data.date ? new Date(data.date).toISOString() : new Date(0).toISOString(),
    excerpt: typeof data.excerpt === 'string' ? data.excerpt.trim() : '',
    tags: Array.isArray(data.tags) ? data.tags.map(tagLabel).filter(Boolean) : [],
    heroImg: typeof data.heroImg === 'string' && data.heroImg ? data.heroImg : null,
    hideFromBlogList: data.hideFromBlogList === true,
    body: content.trim(),
    extra,
  };
}

export function serializePostFile(d: PostDraft): string {
  const data: Record<string, unknown> = {
    title: d.title,
    date: d.date,
    excerpt: d.excerpt,
    tags: d.tags,
    heroImg: d.heroImg,
    ...(d.hideFromBlogList ? { hideFromBlogList: true } : {}),
    ...d.extra,
  };
  const out = matter.stringify(`\n${d.body.trim()}\n`, data);
  return out.endsWith('\n') ? out : `${out}\n`;
}
