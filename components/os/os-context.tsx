'use client';

import type { PostMeta } from '@/lib/posts';
import { createContext, useContext } from 'react';

type OSData = { posts: PostMeta[] };

const OSDataContext = createContext<OSData>({ posts: [] });

export function OSDataProvider({ posts, children }: { posts: PostMeta[]; children: React.ReactNode }) {
  return <OSDataContext.Provider value={{ posts }}>{children}</OSDataContext.Provider>;
}

export function useOSData(): OSData {
  return useContext(OSDataContext);
}
