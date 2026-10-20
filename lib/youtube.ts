/** The video id of a YouTube watch, short, shorts or embed URL, or null for anything else. */
export function youtubeId(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, '');
  if (host === 'youtu.be') return url.pathname.slice(1) || null;
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null;
  if (url.pathname === '/watch') return url.searchParams.get('v');
  const m = url.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})/);
  return m ? m[1] : null;
}
