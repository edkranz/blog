import { EddieOS } from '@/components/os/eddie-os';
import { RouteJsonLd } from '@/components/seo/json-ld';
import { StaticSite } from '@/components/seo/static-site';
import { APP_META } from '@/lib/os/apps-meta';
import type { AppId } from '@/lib/os/types';
import { getPostBySlug, getPublishedPosts, toMeta } from '@/lib/posts';
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

const ROUTE_DESC: Record<string, string> = {
  about: 'About Eddie Kranz — Software Engineer at SSW. Skills, experience and the tech I build with.',
  blog: 'Writing about software development, AI workflows and tinkering by Eddie Kranz.',
  projects: 'Projects by Eddie Kranz — a browser desktop, AI workflows, VR research and more.',
  contact: 'Get in touch with Eddie Kranz.',
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { segments } = await params;
  const canonical = `/${segments.join('/')}`;
  const [first, second] = segments;
  if (first === 'blog' && second) {
    const post = getPostBySlug(second);
    if (post)
      return {
        title: post.title,
        description: post.excerpt,
        alternates: { canonical },
        openGraph: {
          type: 'article',
          title: post.title,
          description: post.excerpt,
          url: canonical,
          publishedTime: new Date(post.date).toISOString(),
          authors: ['Eddie Kranz'],
          images: ['/og.png'],
        },
        twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt, images: ['/og.png'] },
      };
  }
  const meta = APP_META[first as AppId];
  if (meta) {
    const description = ROUTE_DESC[first];
    return {
      title: meta.name,
      ...(description ? { description } : {}),
      alternates: { canonical },
      openGraph: { title: meta.name, ...(description ? { description } : {}), url: canonical, images: ['/og.png'] },
      twitter: { title: meta.name, ...(description ? { description } : {}), images: ['/og.png'] },
    };
  }
  return { alternates: { canonical } };
}

export default async function CatchAll({ params }: Params) {
  const { segments } = await params;
  if (!isKnownRoute(segments)) notFound();
  const posts = getPublishedPosts();
  return (
    <>
      {/* Crawlable, server-rendered content (shown to no-JS / crawlers; the OS overlays it) */}
      <StaticSite segments={segments} posts={posts} />
      <RouteJsonLd segments={segments} posts={posts} />
      {/* OS gets body-less metadata; bodies are lazy-loaded via /api/post/<slug> on open */}
      <EddieOS posts={posts.map(toMeta)} initialPath={segments} />
    </>
  );
}
