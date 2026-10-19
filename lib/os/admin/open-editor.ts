'use client';

import { useWindowStore } from '@/lib/os/store';

/** One editor window per post; `null` opens a new, untitled post. */
export function openEditor(slug: string | null, title: string) {
  const st = useWindowStore.getState();
  const existing = slug ? st.windows.find((w) => w.appId === 'editor' && w.props?.slug === slug) : undefined;
  if (existing) st.focusWindow(existing.id);
  else st.openApp('editor', { props: { slug }, title: title || 'Untitled' });
}
