import { EddieOS } from '@/components/os/eddie-os';
import { RouteJsonLd } from '@/components/seo/json-ld';
import { StaticSite } from '@/components/seo/static-site';
import { getPublishedPosts, toMeta } from '@/lib/posts';

export default function Page() {
  const posts = getPublishedPosts();
  return (
    <>
      {/* Crawlable, server-rendered content (shown to no-JS / crawlers; the OS overlays it) */}
      <StaticSite posts={posts} />
      <RouteJsonLd posts={posts} />
      {/* OS gets body-less metadata; bodies are lazy-loaded via /api/post/<slug> on open */}
      <EddieOS posts={posts.map(toMeta)} />
    </>
  );
}
