import { EddieOS } from '@/components/os/eddie-os';
import { APP_META } from '@/lib/os/apps-meta';
import type { AppId } from '@/lib/os/types';
import { getPostBySlug, getPublishedPosts } from '@/lib/posts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Params = { params: Promise<{ segments: string[] }> };

// Prerender a page for every app route (/about, /blog, …) and every post (/blog/<slug>).
export function generateStaticParams() {
  const apps = (Object.keys(APP_META) as AppId[]).filter((id) => id !== 'welcome').map((id) => ({ segments: [id] }));
  const posts = getPublishedPosts().map((p) => ({ segments: ['blog', p.slug] }));
  return [...apps, ...posts];
}

/** True for a real app route (/about) or post (/blog or /blog/<known-slug>). */
function isKnownRoute(segments: string[]): boolean {
  const [first, second] = segments;
  if (first === 'blog') return !second || !!getPostBySlug(second);
  return first !== 'welcome' && first in APP_META && !second;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { segments } = await params;
  const [first, second] = segments;
  if (first === 'blog' && second) {
    const post = getPostBySlug(second);
    if (post) return { title: post.title, description: post.excerpt };
  }
  const meta = APP_META[first as AppId];
  if (meta) return { title: meta.name };
  return {};
}

export default async function CatchAll({ params }: Params) {
  const { segments } = await params;
  if (!isKnownRoute(segments)) notFound();
  return <EddieOS posts={getPublishedPosts()} initialPath={segments} />;
}
