import { EddieOS } from '@/components/os/eddie-os';
import { StaticSite } from '@/components/seo/static-site';
import { getPublishedPosts } from '@/lib/posts';

export default function Page() {
  const posts = getPublishedPosts();
  return (
    <>
      {/* Crawlable, server-rendered content (shown to no-JS / crawlers; the OS overlays it) */}
      <StaticSite posts={posts} />
      <EddieOS posts={posts} />
    </>
  );
}
