'use client';

import { usePower } from '@/lib/os/power';
import { useEffect, useRef, useState } from 'react';

/** How long the power glyph must be held to power-cycle the machine. */
const HOLD_MS = 2000;

const LANGS = [
  'You need to restart your computer. Hold down the Power button for several seconds or press the Restart button.',
  'Veuillez redémarrer votre ordinateur. Maintenez la touche de démarrage enfoncée pendant plusieurs secondes ou bien appuyez sur le bouton de réinitialisation.',
  'Sie müssen Ihren Computer neu starten. Halten Sie dazu die Einschalttaste einige Sekunden gedrückt oder drücken Sie die Neustart-Taste.',
  'コンピュータを再起動する必要があります。パワーボタンを数秒間押し続けるか、リセットボタンを押してください。',
];

const DOG: Record<string, string> = {
  YOU_DELETED_EVERYTHING: 'you monster. why would you do that?',
  FORK_BOMB_DETONATED: 'was that… really necessary?',
};

function PowerGlyph({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox='0 0 24 24' width={size} height={size} fill='none' stroke='currentColor' strokeWidth={1.5} strokeLinecap='round' aria-hidden>
      <path d='M12 3v8' />
      <path d='M7.05 6.05a7 7 0 1 0 9.9 0' />
    </svg>
  );
}

function DeadDog({ text, size }: { text: string; size: number }) {
  return (
    <div className='pointer-events-none flex flex-col items-center'>
      <div className='relative mb-2 max-w-[220px] rounded-2xl border-2 border-black/25 bg-white px-3 py-1.5 text-center text-[13px] font-bold leading-snug text-zinc-900 shadow-lg'>
        {text}
        <span className='absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-black/25 bg-white' />
      </div>
      <img
        src='/zeppelin/dead.png'
        alt='Zeppelin, knocked out'
        width={size}
        height={size}
        draggable={false}
        style={{ imageRendering: 'pixelated' }}
        className='drop-shadow-[0_6px_4px_rgba(0,0,0,0.35)]'
      />
    </div>
  );
}

export function KernelPanic() {
  const reason = usePower((s) => s.reason);
  const recover = usePower((s) => s.recover);
  const [hold, setHold] = useState(0);
  const holdStart = useRef<number | null>(null);
  const raf = useRef(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Steal focus from whatever was typing (the terminal), so keys land here.
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    buttonRef.current?.focus({ preventScroll: true });
  }, []);

  const endHold = () => {
    holdStart.current = null;
    cancelAnimationFrame(raf.current);
    setHold(0);
  };
  const startHold = () => {
    if (holdStart.current !== null) return;
    holdStart.current = performance.now();
    const tick = () => {
      if (holdStart.current === null) return;
      const p = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
      setHold(p);
      if (p >= 1) {
        holdStart.current = null;
        recover();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  // Holding Enter / Space works too.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        e.preventDefault();
        startHold();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') endHold();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', endHold);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', endHold);
      cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dog = DOG[reason] ?? 'what did you do?';

  return (
    <div className='fixed inset-0 z-[100001] select-none overflow-hidden bg-[#0000aa] text-white' role='alertdialog' aria-label='Kernel panic'>
      <div className='os-panic__screen os-scroll relative h-full w-full overflow-y-auto px-6 pb-10 pt-[max(48px,12vh)]'>
        <div className='mx-auto w-full max-w-[620px]'>
          <div className='flex justify-center'>
            <button
              ref={buttonRef}
              type='button'
              aria-label='Hold to restart'
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                startHold();
              }}
              onPointerUp={endHold}
              onPointerCancel={endHold}
              onContextMenu={(e) => e.preventDefault()}
              style={{ ['--hold' as string]: hold, touchAction: 'none' }}
              className='os-hold-ring grid h-[88px] w-[88px] cursor-pointer place-items-center rounded-full p-[4px] outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-white/70'
            >
              <span className='grid h-full w-full place-items-center rounded-full bg-[#0000aa] text-white/90'>
                <PowerGlyph size={44} />
              </span>
            </button>
          </div>

          <div className='mt-9 space-y-4 text-[15px] leading-relaxed text-white/95'>
            {LANGS.map((p) => (
              <p key={p.slice(0, 12)}>{p}</p>
            ))}
          </div>

          <div className='mt-10 flex justify-center md:hidden'>
            <DeadDog text={dog} size={120} />
          </div>
        </div>
      </div>

      <div className='pointer-events-none absolute bottom-6 right-8 hidden md:block'>
        <DeadDog text={dog} size={150} />
      </div>
      <div className='os-panic__scanlines pointer-events-none absolute inset-0' />
    </div>
  );
}
