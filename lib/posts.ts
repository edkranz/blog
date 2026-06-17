import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type Post = {
  slug: string;
  title: string;
  date: string; // ISO string
  excerpt: string;
  tags: string[];
  heroImg: string | null;
  hideFromBlogList: boolean;
  body: string; // raw markdown
  readingMinutes: number;
};

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

function tagLabel(raw: unknown): string {
  // Tina stored tags as { tag: 'content/tags/ai.mdx' }; normalise to "ai".
  const value = typeof raw === 'string' ? raw : ((raw as { tag?: string })?.tag ?? '');
  const base = value.split('/').pop() ?? value;
  return base.replace(/\.mdx?$/, '');
}

function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function parseFile(fileName: string): Post {
  const full = path.join(POSTS_DIR, fileName);
  const raw = fs.readFileSync(full, 'utf8');
  const { data, content } = matter(raw);
  const slug = fileName.replace(/\.mdx?$/, '');

  const tags = Array.isArray(data.tags) ? data.tags.map(tagLabel).filter(Boolean) : [];

  return {
    slug,
    title: typeof data.title === 'string' ? data.title : slug,
    date: data.date ? new Date(data.date).toISOString() : new Date(0).toISOString(),
    excerpt: typeof data.excerpt === 'string' ? data.excerpt.trim() : '',
    tags,
    heroImg: typeof data.heroImg === 'string' && data.heroImg ? data.heroImg : null,
    hideFromBlogList: data.hideFromBlogList === true,
    body: content.trim(),
    readingMinutes: readingMinutes(content),
  };
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .map(parseFile)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Posts shown in the Blog window list (excludes `hideFromBlogList`). */
export function getPublishedPosts(): Post[] {
  return getAllPosts().filter((p) => !p.hideFromBlogList);
}

export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

/** Post metadata without the (potentially large) markdown body. */
export type PostMeta = Omit<Post, 'body'>;

/** Drop the body so post lists can be sent to the client OS without shipping every body. */
export function toMeta(p: Post): PostMeta {
  return {
    slug: p.slug,
    title: p.title,
    date: p.date,
    excerpt: p.excerpt,
    tags: p.tags,
    heroImg: p.heroImg,
    hideFromBlogList: p.hideFromBlogList,
    readingMinutes: p.readingMinutes,
  };
}
