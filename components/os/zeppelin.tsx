'use client';

import { MENUBAR_H } from '@/lib/os/constants';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

type Mode = 'enter' | 'idle' | 'running' | 'chat' | 'sleeping';
type Msg = { from: 'you' | 'zep'; text: string };

const SPRITES = {
  sit: '/zeppelin/sit.png',
  runA: '/zeppelin/run-a.png',
  runB: '/zeppelin/run-b.png',
  happy: '/zeppelin/happy.png',
  sleep: '/zeppelin/sleep.png',
};
const SIZE = 104;
const SPEED = 200; // px / second
const PANEL_W = 268;
const WOOFS = ['woof', 'woof woof', 'woof woof woof!', 'awoooo~', 'woof! 🐾', 'woof woof'];
const IDLE_THOUGHTS = ['woof?', '*sniff sniff*', 'pet me?', '🦴', '*wags tail*', 'woof woof'];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

export function Zeppelin() {
  const [mode, setMode] = useState<Mode>('enter');
  const [pos, setPos] = useState({ x: -400, y: -400 });
  const [facing, setFacing] = useState(1);
  const [frame, setFrame] = useState(0);
  const [moveDur, setMoveDur] = useState(0);
  const [bubble, setBubble] = useState<string | null>(null);
  const [cycle, setCycle] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const posRef = useRef(pos);
  posRef.current = pos;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Entrance: trot in near the dock, greet, then start wandering.
  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({ x: Math.min(vw - SIZE - 48, vw * 0.68), y: vh - SIZE - 132 });
    setBubble("Woof! I'm Zeppelin 🐾");
    const a = setTimeout(() => setBubble(null), 2600);
    const b = setTimeout(() => setMode('idle'), 2800);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  // Decide the next idle action: scamper somewhere, or have a little thought.
  const act = useCallback(() => {
    if (Math.random() < 0.4) {
      setBubble(pick(IDLE_THOUGHTS));
      setTimeout(() => setBubble(null), 2400);
      setCycle((c) => c + 1); // re-arm the scheduler without leaving idle
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tx = rand(24, vw - SIZE - 24);
    const ty = rand(MENUBAR_H + 28, vh - SIZE - 100);
    const { x, y } = posRef.current;
    const dist = Math.hypot(tx - x, ty - y);
    setFacing(tx < x ? -1 : 1);
    setMoveDur(Math.max(450, (dist / SPEED) * 1000));
    setPos({ x: tx, y: ty });
    setMode('running');
  }, []);

  // Scheduler: idle → wait → act; running → arrive → idle.
  useEffect(() => {
    if (mode === 'idle') {
      const id = setTimeout(act, rand(2400, 5400));
      return () => clearTimeout(id);
    }
    if (mode === 'running') {
      const id = setTimeout(() => setMode('idle'), moveDur);
      return () => clearTimeout(id);
    }
  }, [mode, cycle, moveDur, act]);

  // Leg animation while running.
  useEffect(() => {
    if (mode !== 'running') return;
    const id = setInterval(() => setFrame((f) => (f ? 0 : 1)), 130);
    return () => clearInterval(id);
  }, [mode]);

  // Keep the chat scrolled to the latest woof.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999 });
  }, []);

  const sprite =
    mode === 'running'
      ? frame
        ? SPRITES.runB
        : SPRITES.runA
      : mode === 'sleeping'
        ? SPRITES.sleep
        : mode === 'chat' || mode === 'enter'
          ? SPRITES.happy
          : SPRITES.sit;

  const onPet = () => {
    if (mode === 'chat') return;
    if (mode === 'sleeping') {
      setMode('idle');
      return;
    }
    // Open the chat — nudge into a spot where the bubble fits on screen.
    const vw = window.innerWidth;
    const half = PANEL_W / 2 - SIZE / 2;
    const x = Math.min(Math.max(posRef.current.x, half + 12), vw - half - SIZE - 12);
    const y = Math.max(posRef.current.y, MENUBAR_H + 250);
    setMoveDur(180);
    setPos({ x, y });
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

  const nap = () => {
    const vh = window.innerHeight;
    setMoveDur(650);
    setPos({ x: 28, y: vh - SIZE - 100 });
    setMode('sleeping');
  };

  return (
    <div className='pointer-events-none fixed inset-0 z-[8000] select-none'>
      <div
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
                <img src={SPRITES.happy} alt='' width={24} height={24} style={{ imageRendering: 'pixelated' }} className='drop-shadow' />
                <span className='text-[13px] font-bold'>Zeppelin</span>
                <span className='text-[11px] text-muted-foreground'>· good boy</span>
                <div className='ml-auto flex items-center gap-1'>
                  <button type='button' onClick={nap} title='Let him nap' className='grid h-6 w-6 place-items-center rounded-md text-[13px] text-foreground/55 transition hover:bg-foreground/10'>
                    💤
                  </button>
                  <button type='button' onClick={() => setMode('idle')} title='Close' className='grid h-6 w-6 place-items-center rounded-md text-foreground/55 transition hover:bg-foreground/10'>
                    ✕
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
          aria-label='Zeppelin the dog — click to chat'
          className={cn('pointer-events-auto block cursor-pointer border-0 bg-transparent p-0', mode === 'enter' && 'zep-pop', mode === 'idle' && 'zep-bob')}
          style={{ width: SIZE, height: SIZE }}
        >
          <img
            src={sprite}
            alt='Zeppelin'
            width={SIZE}
            height={SIZE}
            draggable={false}
            style={{ transform: `scaleX(${facing})`, imageRendering: 'pixelated' }}
            className='h-full w-full object-contain drop-shadow-[0_5px_3px_rgba(0,0,0,0.28)]'
          />
        </button>
      </div>
    </div>
  );
}
