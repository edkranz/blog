'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

const PALETTE = ['#f54e00', '#1d4aff', '#f9bd2b', '#c063ff', '#2dbd84', '#29c7d6'];

type Frame = (api: { ctx: CanvasRenderingContext2D; w: number; h: number; t: number }) => void;

/** Sizes a canvas to its parent (HiDPI), runs a RAF loop, and cleans up. */
function runCanvas(canvas: HTMLCanvasElement, frame: Frame, fps = 0): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;
  const size = () => {
    const r = canvas.parentElement?.getBoundingClientRect();
    if (!r) return;
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  const ro = new ResizeObserver(size);
  if (canvas.parentElement) ro.observe(canvas.parentElement);
  let raf = 0;
  let start = 0;
  let last = 0;
  const interval = fps ? 1000 / fps : 0;
  const loop = (ts: number) => {
    if (!start) start = ts;
    if (!interval || ts - last >= interval) {
      last = ts;
      frame({ ctx, w, h, t: (ts - start) / 1000 });
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}

function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    type P = { x: number; y: number; vx: number; vy: number; c: string };
    let pts: P[] = [];
    const mouse = { x: -999, y: -999 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => {
      mouse.x = -999;
      mouse.y = -999;
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    const DIST = 116;
    const stop = runCanvas(canvas, ({ ctx, w, h }) => {
      if (pts.length === 0) {
        const n = Math.min(72, Math.max(24, Math.floor((w * h) / 9000)));
        pts = Array.from({ length: n }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        }));
      }
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        p.x = Math.max(0, Math.min(w, p.x));
        p.y = Math.max(0, Math.min(h, p.y));
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dm = Math.hypot(dx, dy);
        if (dm < 170) {
          p.vx += (dx / dm) * 0.04;
          p.vy += (dy / dm) * 0.04;
          ctx.strokeStyle = `${p.c}${Math.round((1 - dm / 170) * 120).toString(16).padStart(2, '0')}`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
        p.vx *= 0.99;
        p.vy *= 0.99;
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < DIST) {
            ctx.strokeStyle = `rgba(255,255,255,${(1 - d / DIST) * 0.16})`;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      stop();
    };
  }, []);
  return <canvas ref={ref} className='h-full w-full' />;
}

function GameOfLife() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const CELL = 9;
    let cols = 0;
    let rows = 0;
    let grid: Uint8Array = new Uint8Array(0);
    let colors: string[] = [];
    const seed = () => {
      grid = new Uint8Array(cols * rows);
      colors = Array.from({ length: cols * rows }, () => PALETTE[Math.floor(Math.random() * PALETTE.length)]);
      for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < 0.28 ? 1 : 0;
    };
    const onClick = () => seed();
    canvas.addEventListener('click', onClick);

    const stop = runCanvas(
      canvas,
      ({ ctx, w, h }) => {
        const c = Math.floor(w / CELL);
        const r = Math.floor(h / CELL);
        if (c !== cols || r !== rows) {
          cols = c;
          rows = r;
          seed();
        }
        const next = new Uint8Array(grid.length);
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            let n = 0;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + cols) % cols;
                const ny = (y + dy + rows) % rows;
                n += grid[ny * cols + nx];
              }
            const idx = y * cols + x;
            next[idx] = grid[idx] ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
          }
        }
        grid = next;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < grid.length; i++) {
          if (!grid[i]) continue;
          const x = (i % cols) * CELL;
          const y = Math.floor(i / cols) * CELL;
          ctx.fillStyle = colors[i];
          ctx.fillRect(x + 0.5, y + 0.5, CELL - 1.5, CELL - 1.5);
        }
      },
      11,
    );
    return () => {
      canvas.removeEventListener('click', onClick);
      stop();
    };
  }, []);
  return <canvas ref={ref} className='h-full w-full cursor-pointer' />;
}

function DvdBounce() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const bw = 92;
    const bh = 34;
    let x = 30;
    let y = 24;
    let vx = 1.5;
    let vy = 1.2;
    let ci = 0;
    const stop = runCanvas(canvas, ({ ctx, w, h }) => {
      x += vx;
      y += vy;
      let hit = false;
      if (x <= 0 || x + bw >= w) {
        vx *= -1;
        x = Math.max(0, Math.min(w - bw, x));
        hit = true;
      }
      if (y <= 0 || y + bh >= h) {
        vy *= -1;
        y = Math.max(0, Math.min(h - bh, y));
        hit = true;
      }
      if (hit) ci = (ci + 1) % PALETTE.length;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = PALETTE[ci];
      const rr = 8;
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, rr);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('eddie', x + bw / 2, y + bh / 2 + 1);
    });
    return stop;
  }, []);
  return <canvas ref={ref} className='h-full w-full' />;
}

export const SKETCHES: Record<string, () => React.JSX.Element> = {
  particles: Particles,
  life: GameOfLife,
  dvd: DvdBounce,
};

const HINTS: Record<string, string> = {
  particles: 'Live JS canvas — move your cursor through it',
  life: "Conway's Game of Life — click to reseed",
  dvd: 'Will it ever hit the corner?',
};

export function SketchFrame({ name, height, caption }: { name?: string; height?: string; caption?: string }) {
  const Comp = name ? SKETCHES[name] : undefined;
  const h = height ? Number.parseInt(height, 10) : 300;
  return (
    <figure className='my-6 not-prose'>
      <div className='relative overflow-hidden rounded-xl border border-white/10 bg-[#0e0f14]' style={{ height: h }}>
        {Comp ? <Comp /> : <div className='grid h-full place-items-center text-sm text-white/50'>unknown sketch: {name}</div>}
        <span className='pointer-events-none absolute left-2.5 top-2.5 rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/70'>
          canvas · {name}
        </span>
      </div>
      <figcaption className={cn('mt-2 text-center text-[13px] text-muted-foreground')}>
        {caption ?? (name && HINTS[name]) ?? 'Live JS canvas'}
      </figcaption>
    </figure>
  );
}
