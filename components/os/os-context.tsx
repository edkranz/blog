'use client';

import type { Post } from '@/lib/posts';
import { createContext, useContext } from 'react';

type OSData = { posts: Post[] };

const OSDataContext = createContext<OSData>({ posts: [] });

export function OSDataProvider({ posts, children }: { posts: Post[]; children: React.ReactNode }) {
  return <OSDataContext.Provider value={{ posts }}>{children}</OSDataContext.Provider>;
}

export function useOSData(): OSData {
  return useContext(OSDataContext);
}
