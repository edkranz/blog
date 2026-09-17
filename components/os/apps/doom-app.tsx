'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * DOOM (shareware), run by js-dos — DOSBox compiled to WebAssembly.
 *
 * Nothing heavy loads until the user presses play: only then is the <iframe> mounted,
 * which pulls the emulator + game bundle from /public/doom. The iframe isolates the
 * emulator's globals, and closing the window unmounts it — zero CPU when not on screen.
 */
export function DoomApp() {
  const [started, setStarted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Give the freshly-mounted frame keyboard focus so the arrow keys work.
  useEffect(() => {
    if (!started) return;
    const id = window.setTimeout(() => iframeRef.current?.focus(), 300);
    return () => window.clearTimeout(id);
  }, [started]);

  return (
    <div className='relative h-full w-full overflow-hidden bg-black'>
      {started ? (
        <iframe
          ref={iframeRef}
          src='/doom/index.html'
          title='DOOM'
          allow='autoplay; fullscreen; pointer-lock'
          className='h-full w-full border-0'
          onClick={() => iframeRef.current?.focus()}
        />
      ) : (
        <button
          type='button'
          onClick={() => setStarted(true)}
          aria-label='Play DOOM'
          className='group flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center'
          style={{ background: 'radial-gradient(120% 80% at 50% 35%, #2a0d08 0%, #0a0503 70%, #000 100%)' }}
        >
          <span
            className='font-black leading-none tracking-tight text-[#c2381f]'
            style={{ fontSize: 'clamp(48px, 16vw, 110px)', textShadow: '0 3px 0 #5a160c, 0 0 28px rgba(194,56,31,0.5)' }}
          >
            DOOM
          </span>
          <span className='btn-chunky rounded-lg bg-[#c2381f] px-7 py-2.5 text-sm font-bold uppercase tracking-widest text-white transition group-hover:brightness-110'>
            ▶ Play
          </span>
        </button>
      )}
    </div>
  );
}
