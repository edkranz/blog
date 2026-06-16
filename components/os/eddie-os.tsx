'use client';

import type { Post } from '@/lib/posts';
import { Desktop } from './desktop';
import { OSDataProvider } from './os-context';

export function EddieOS({ posts, initialPath }: { posts: Post[]; initialPath?: string[] }) {
  return (
    <OSDataProvider posts={posts}>
      <Desktop initialPath={initialPath} />
    </OSDataProvider>
  );
}
