import { EddieOS } from '@/components/os/eddie-os';
import { getPublishedPosts, toMeta } from '@/lib/posts';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function AdminPage() {
  return <EddieOS posts={getPublishedPosts().map(toMeta)} admin />;
}
