'use client';

import { usePower } from '@/lib/os/power';
import { useEffect, useState } from 'react';

/** `shutdown`: fade to black, then the classic orange sign-off. Any key / click turns it back on. */
export function ShutdownScreen() {
  const reboot = usePower((s) => s.reboot);
  const [off, setOff] = useState(false);

  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    const id = window.setTimeout(() => setOff(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!off) return;
    const onKey = () => reboot();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [off, reboot]);

  return (
    <div className='fixed inset-0 z-[100001] select-none bg-black text-center' onClick={off ? reboot : undefined} role='presentation'>
      {off ? (
        <div className='grid h-full place-items-center px-6'>
          <div>
            <p className='os-shutdown__text font-mono text-[clamp(17px,3vw,30px)] font-bold leading-snug tracking-wide'>
              It is now safe to turn off
              <br />
              your computer.
            </p>
            <p className='mt-8 font-mono text-[12px] text-zinc-600'>(click, or press any key, to turn it back on)</p>
          </div>
        </div>
      ) : (
        <div className='grid h-full place-items-center font-mono text-[13px] text-zinc-500'>Shutting down…</div>
      )}
      <div className='os-panic__scanlines pointer-events-none absolute inset-0' />
    </div>
  );
}
