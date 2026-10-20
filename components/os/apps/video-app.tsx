'use client';

import type { OSWindow } from '@/lib/os/types';

/** A YouTube embed. The player only mounts while the window is open, so closing it stops playback. */
export function VideoApp({ win }: { win: OSWindow }) {
  const videoId = win.props?.videoId as string | undefined;

  return (
    <div className='h-full w-full overflow-hidden bg-black'>
      {videoId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&playsinline=1`}
          title={win.title}
          allow='autoplay; encrypted-media; picture-in-picture; fullscreen'
          allowFullScreen
          referrerPolicy='strict-origin-when-cross-origin'
          className='h-full w-full border-0'
        />
      ) : null}
    </div>
  );
}
