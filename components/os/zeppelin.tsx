'use client';

import { MENUBAR_H } from '@/lib/os/constants';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

type Mode = 'sleeping' | 'chat' | 'following' | 'shake' | 'excited' | 'loved';
type Dir = 'side' | 'front' | 'back' | 'se' | 'ne';
type Msg = { from: 'you' | 'zep'; text: string };

const S = {
  sit: '/zeppelin/sit.png',
  runA: '/zeppelin/run-a.png',
  runB: '/zeppelin/run-b.png',
  frontA: '/zeppelin/front-a.png',
  frontB: '/zeppelin/front-b.png',
  backA: '/zeppelin/back-a.png',
  backB: '/zeppelin/back-b.png',
  seA: '/zeppelin/se-a.png',
  seB: '/zeppelin/se-b.png',
  neA: '/zeppelin/ne-a.png',
  neB: '/zeppelin/ne-b.png',
  happy: '/zeppelin/happy.png',
  shake: '/zeppelin/shake.png',
  excited: '/zeppelin/excited.png',
  loved: '/zeppelin/loved.png',
  sleep: '/zeppelin/sleep.png',
};
const SIZE = 104;
const FOLLOW_SPEED = 290; // px / second toward the treat
const RUN_START = 165; // cursor must be this far (from his centre) before he starts chasing
const RUN_STOP = 92; // …and he stops to shake once it's this close (hysteresis kills the jitter)
const PANEL_W = 268;
const PANEL_H = 214;
const WOOFS = ['woof', 'woof woof', 'woof woof woof!', 'awoooo~', 'woof! 🐾', 'woof woof'];

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function Zeppelin() {
  const [mode, setMode] = useState<Mode>('sleeping');
  const [pos, setPos] = useState({ x: -400, y: -400 });
  const [facing, setFacing] = useState(1);
  const [dir, setDir] = useState<Dir>('side');
  const [frame, setFrame] = useState(0);
  const [moveDur, setMoveDur] = useState(0);
  const [bubble, setBubble] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [treat, setTreat] = useState(false);
  const [cursor, setCursor] = useState({ x: -400, y: -400 });
  const posRef = useRef(pos);
  posRef.current = pos;
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Curl up in the bottom-right corner and go to sleep.
  const sleep = useCallback(() => {
    setMoveDur(520);
    setPos({ x: window.innerWidth - SIZE - 24, y: window.innerHeight - SIZE - 96 });
    setBubble(null);
    setMode('sleeping');
  }, []);

  // Starts asleep.
  useEffect(() => {
    setPos({ x: window.innerWidth - SIZE - 24, y: window.innerHeight - SIZE - 96 });
  }, []);

  // Pick one of 8 directions for the run sprites (right-facing sets flip for their left twins).
  const aimSprite = (dx: number, dy: number) => {
    const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360; // 0=E, 90=S(down), 270=N(up)
    let set: Dir = 'side';
    let fl = 1;
    if (deg >= 337.5 || deg < 22.5) {
      set = 'side';
    } else if (deg < 67.5) {
      set = 'se';
    } else if (deg < 112.5) {
      set = 'front';
    } else if (deg < 157.5) {
      set = 'se';
      fl = -1;
    } else if (deg < 202.5) {
      set = 'side';
      fl = -1;
    } else if (deg < 247.5) {
      set = 'ne';
      fl = -1;
    } else if (deg < 292.5) {
      set = 'back';
    } else {
      set = 'ne';
    }
    setDir(set);
    setFacing(fl);
  };

  // Leg animation while chasing the treat.
  useEffect(() => {
    if (mode !== 'following') return;
    const id = setInterval(() => setFrame((f) => (f ? 0 : 1)), 130);
    return () => clearInterval(id);
  }, [mode]);

  // Treat held → track the cursor and chase it; shake a paw when it's right in front of him.
  useEffect(() => {
    if (!treat) return;
    setBubble(null);
    const onMove = (e: PointerEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener('pointermove', onMove);
    let raf = 0;
    let prev = 0;
    let running = false;
    const step = (t: number) => {
      const dt = prev ? Math.min(0.05, (t - prev) / 1000) : 0;
      prev = t;
      const cx = cursorRef.current.x;
      const cy = cursorRef.current.y;
      const { x, y } = posRef.current;
      const dist = Math.hypot(cx - (x + SIZE / 2), cy - (y + SIZE / 2));
      // Hysteresis: start chasing only past RUN_START, stop only within RUN_STOP — no jitter in between.
      if (running ? dist <= RUN_STOP : dist >= RUN_START) running = !running;
      if (running) {
        const tx = cx - SIZE / 2;
        const ty = cy - SIZE * 0.62;
        const d = Math.hypot(tx - x, ty - y) || 1;
        const v = FOLLOW_SPEED * dt;
        setPos({ x: x + ((tx - x) / d) * v, y: y + ((ty - y) / d) * v });
        aimSprite(cx - (x + SIZE / 2), cy - (y + SIZE / 2));
        setMoveDur(0);
        setMode('following');
      } else {
        setFacing(cx < x + SIZE / 2 ? -1 : 1);
        setMode('shake');
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [treat]);

  // Esc puts the treat away.
  useEffect(() => {
    if (!treat) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTreat(false);
        sleep();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [treat, sleep]);

  // Clicking anywhere outside the chat dismisses it (back to sleep).
  useEffect(() => {
    if (mode !== 'chat') return;
    const onDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) sleep();
    };
    const id = window.setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [mode, sleep]);

  const sprite = (() => {
    if (mode === 'sleeping') return S.sleep;
    if (mode === 'shake') return S.shake;
    if (mode === 'loved') return S.loved;
    if (mode === 'excited') return S.excited;
    if (mode === 'chat') return S.happy;
    if (mode === 'following') {
      const sets: Record<Dir, [string, string]> = {
        side: [S.runA, S.runB],
        front: [S.frontA, S.frontB],
        back: [S.backA, S.backB],
        se: [S.seA, S.seB],
        ne: [S.neA, S.neB],
      };
      const set = sets[dir];
      return frame ? set[1] : set[0];
    }
    return S.sit;
  })();
  const flip = mode === 'following' ? facing : 1;

  const giveTreat = () => {
    setTreat(false);
    setMoveDur(0);
    setBubble('woof woof! 🦴❤️');
    setMode('excited');
    window.setTimeout(() => setMode('loved'), 600);
    window.setTimeout(() => setBubble(null), 3200);
    window.setTimeout(() => setMode('sleeping'), 3400); // contentedly dozes off where he is
  };

  const startTreat = () => {
    setMode('following');
    setMoveDur(0);
    setTreat(true);
  };

  const onPet = () => {
    if (treat) {
      giveTreat();
      return;
    }
    if (mode === 'chat') return;
    // Wake up and open the chat, nudged into a spot where the bubble fits on screen.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const half = PANEL_W / 2 - SIZE / 2;
    const x = clamp(posRef.current.x, half + 12, vw - half - SIZE - 12);
    const y = clamp(posRef.current.y, MENUBAR_H + PANEL_H, vh - SIZE - 16);
    setMoveDur(180);
    setPos({ x, y });
    setDir('side');
    setFacing(1);
    if (msgs.length === 0) setMsgs([{ from: 'zep', text: pick(['Woof! 🐾', 'woof woof!']) }]);
    setMode('chat');
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMsgs((m) => [...m, { from: 'you', text }]);
    setTimeout(() => {
      setMsgs((m) => [...m, { from: 'zep', text: pick(WOOFS) }]);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 999999 }));
    }, 430);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 999999 }));
  };

  return (
    <div className='pointer-events-none fixed inset-0 z-[8000] select-none'>
      {/* the treat that follows the cursor */}
      {treat ? <div className='zep-treat pointer-events-none fixed text-2xl' style={{ left: cursor.x, top: cursor.y }}>🦴</div> : null}

      <div
        ref={containerRef}
        className='absolute left-0 top-0'
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, transition: moveDur ? `transform ${moveDur}ms linear` : 'none' }}
      >
        {/* thought bubble */}
        {bubble && mode !== 'chat' ? (
          <div className='absolute bottom-[calc(100%-8px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl border-2 border-foreground/15 bg-card px-3 py-1.5 text-[13px] font-bold shadow-lg'>
            {bubble}
            <span className='absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-foreground/15 bg-card' />
          </div>
        ) : null}

        {/* chat panel */}
        {mode === 'chat' ? (
          <div className='pointer-events-auto absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2' style={{ width: PANEL_W }}>
            <div className='os-window-shadow relative overflow-hidden rounded-2xl border-2 border-foreground/15 bg-card'>
              <div className='flex items-center gap-2 border-b bg-secondary/60 px-3 py-2'>
                <img src={S.happy} alt='' width={24} height={24} style={{ imageRendering: 'pixelated' }} className='drop-shadow' />
                <span className='text-[13px] font-bold'>Zeppelin</span>
                <span className='text-[11px] text-muted-foreground'>· good boy</span>
                <div className='ml-auto flex items-center gap-1.5'>
                  <button
                    type='button'
                    onClick={startTreat}
                    title='Hold out a treat'
                    className='grid h-7 w-7 place-items-center rounded-lg border border-border bg-card text-[15px] transition hover:bg-foreground/10'
                  >
                    🦴
                  </button>
                  <button
                    type='button'
                    onClick={sleep}
                    title='Let him sleep'
                    className='grid h-7 w-7 place-items-center rounded-lg border border-foreground/25 bg-foreground/10 text-[15px] transition hover:bg-foreground/20'
                  >
                    💤
                  </button>
                </div>
              </div>
              <div ref={scrollRef} className='os-scroll max-h-44 min-h-[92px] space-y-2 overflow-y-auto px-3 py-2.5'>
                {msgs.map((m, i) => (
                  <div key={`${m.from}-${i}`} className={cn('flex', m.from === 'you' ? 'justify-end' : 'justify-start')}>
                    <span className={cn('max-w-[80%] rounded-2xl px-2.5 py-1.5 text-[13px] leading-snug', m.from === 'you' ? 'bg-primary text-primary-foreground' : 'bg-secondary font-semibold')}>
                      {m.text}
                    </span>
                  </div>
                ))}
              </div>
              <div className='flex items-center gap-1.5 border-t p-2'>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') send();
                  }}
                  placeholder='Tell Zeppelin something…'
                  className='min-w-0 flex-1 rounded-lg border bg-background px-2.5 py-1.5 text-[13px] outline-none transition focus:border-primary'
                />
                <button type='button' onClick={send} className='btn-chunky shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground'>
                  Send
                </button>
              </div>
              <span className='absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-foreground/15 bg-card' />
            </div>
          </div>
        ) : null}

        {/* the dog */}
        <button
          type='button'
          onClick={onPet}
          aria-label='Zeppelin the dog'
          className={cn('pointer-events-auto block cursor-pointer border-0 bg-transparent p-0', mode === 'sleeping' && 'zep-sleep')}
          style={{ width: SIZE, height: SIZE }}
        >
          <img
            src={sprite}
            alt='Zeppelin'
            width={SIZE}
            height={SIZE}
            draggable={false}
            fetchPriority='low'
            style={{ transform: `scaleX(${flip})`, imageRendering: 'pixelated' }}
            className='h-full w-full object-contain drop-shadow-[0_5px_3px_rgba(0,0,0,0.28)]'
          />
        </button>
      </div>
    </div>
  );
}
