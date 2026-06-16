import { APP_META } from './apps-meta';
import type { AppId } from './types';

/** The URL path that represents a focused window (welcome === home). */
export function pathForWindow(appId: AppId | null | undefined, slug?: string | null): string {
  if (!appId || appId === 'welcome') return '/';
  if (appId === 'blog' && slug) return `/blog/${slug}`;
  return `/${appId}`;
}

export type ParsedRoute = { appId?: AppId; slug?: string; fullscreen?: boolean };

/** Resolve an app to open from a path (/blog/slug, /about, …) or legacy query (?post=/?app=). */
export function parseRoute(segments: string[] | undefined, search: string): ParsedRoute {
  const params = new URLSearchParams(search);
  const fullscreen = params.get('view') === 'full' || params.get('fullscreen') === '1';

  const qPost = params.get('post');
  if (qPost) return { appId: 'blog', slug: qPost, fullscreen };
  const qApp = params.get('app');
  if (qApp && qApp in APP_META) return { appId: qApp as AppId, fullscreen };

  if (!segments || segments.length === 0) return { fullscreen };
  const [first, second] = segments;
  if (first === 'blog') return { appId: 'blog', slug: second, fullscreen };
  if (first in APP_META) return { appId: first as AppId, fullscreen };
  return { fullscreen };
}
