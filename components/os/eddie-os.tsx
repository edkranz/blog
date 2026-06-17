'use client';

import type { PostMeta } from '@/lib/posts';
import { Desktop } from './desktop';
import { OSDataProvider } from './os-context';

export function EddieOS({ posts, initialPath }: { posts: PostMeta[]; initialPath?: string[] }) {
  return (
    <OSDataProvider posts={posts}>
      <Desktop initialPath={initialPath} />
    </OSDataProvider>
  );
}
