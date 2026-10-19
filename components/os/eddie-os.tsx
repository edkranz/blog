'use client';

import type { PostMeta } from '@/lib/posts';
import { Desktop } from './desktop';
import { OSDataProvider } from './os-context';

export function EddieOS({ posts, initialPath, admin }: { posts: PostMeta[]; initialPath?: string[]; admin?: boolean }) {
  return (
    <OSDataProvider posts={posts}>
      <Desktop initialPath={initialPath} admin={admin} />
    </OSDataProvider>
  );
}
