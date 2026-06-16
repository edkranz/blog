'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

// giscus config for edkranz/blog. Comments live in the "Announcements" category
// so visitors can comment but can't open arbitrary discussions on the repo.
const GISCUS = {
  repo: 'edkranz/blog',
  repoId: 'R_kgDOOpE7yA',
  category: 'Announcements',
  categoryId: 'DIC_kwDOOpE7yM4C_Q7y',
};

const giscusTheme = (resolved: string | undefined) => (resolved === 'dark' ? 'noborder_dark' : 'noborder_light');

/** GitHub-Discussions comments for a blog post, keyed by its slug. */
export function GiscusComments({ term }: { term: string }) {
  const host = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const theme = giscusTheme(resolvedTheme);

  // (Re)inject the giscus embed whenever the post changes. Theme is intentionally
  // not a dependency — it's hot-swapped below (no full iframe reload).
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    const attrs: Record<string, string> = {
      'data-repo': GISCUS.repo,
      'data-repo-id': GISCUS.repoId,
      'data-category': GISCUS.category,
      'data-category-id': GISCUS.categoryId,
      'data-mapping': 'specific',
      'data-term': term,
      'data-strict': '1',
      'data-reactions-enabled': '1',
      'data-emit-metadata': '0',
      'data-input-position': 'top',
      'data-theme': theme,
      'data-lang': 'en',
      'data-loading': 'lazy',
    };
    for (const [k, v] of Object.entries(attrs)) script.setAttribute(k, v);
    el.appendChild(script);
    return () => {
      el.innerHTML = '';
    };
  }, [term]);

  // Live-sync the giscus theme with the site theme (no reload).
  useEffect(() => {
    const frame = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app');
  }, [theme]);

  return <div ref={host} className='giscus min-h-[160px]' />;
}
