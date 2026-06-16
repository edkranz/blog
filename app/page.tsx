import { EddieOS } from '@/components/os/eddie-os';
import { getPublishedPosts } from '@/lib/posts';

export default function Page() {
  const posts = getPublishedPosts();
  return <EddieOS posts={posts} />;
}
