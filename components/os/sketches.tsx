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
          ctx.strokeStyle = `${p.c}${Math.round((1 - dm / 170) * 120)
            .toString(16)
            .padStart(2, '0')}`;
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
      11
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

// Eddy's muscle fatigue model: each hard set adds fatigue that decays as exp(-t/τ),
// recovery = 100 × (1 − F/C). Clicking a muscle logs 4 sets at RIR 1 (synergists get half).
function Recovery() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const C = 8;
    const WORKOUT = 4 * 0.9;
    const HOURS_PER_SEC = 4;
    const TOP = 40;
    const muscles = [
      { name: 'Chest', tau: 30, syn: ['Triceps', 'Shoulders'], f: 3 },
      { name: 'Back', tau: 30, syn: ['Biceps'], f: 0 },
      { name: 'Shoulders', tau: 24, syn: ['Triceps'], f: 1.5 },
      { name: 'Biceps', tau: 24, syn: [], f: 0 },
      { name: 'Triceps', tau: 24, syn: [], f: 2.5 },
      { name: 'Quads', tau: 36, syn: ['Glutes'], f: 5 },
      { name: 'Hamstrings', tau: 36, syn: ['Glutes'], f: 1 },
      { name: 'Glutes', tau: 36, syn: ['Hamstrings'], f: 3 },
    ].map((m) => ({ ...m, flash: 0 }));
    let hours = 0;
    let lastT = 0;
    let rowH = 28;
    let hover = -1;

    const rowAt = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const i = Math.floor((e.clientY - r.top - TOP) / rowH);
      return i >= 0 && i < muscles.length ? i : -1;
    };
    const onClick = (e: PointerEvent) => {
      const i = rowAt(e);
      if (i < 0) return;
      const m = muscles[i];
      m.f += WORKOUT;
      m.flash = 1;
      for (const s of m.syn) {
        const sm = muscles.find((x) => x.name === s);
        if (sm) sm.f += WORKOUT * 0.5;
      }
    };
    const onMove = (e: PointerEvent) => {
      hover = rowAt(e);
    };
    const onLeave = () => {
      hover = -1;
    };
    canvas.addEventListener('pointerdown', onClick);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    // Red → yellow → green, the same ramp as the app's body map.
    const ramp = (p: number) => {
      const lerp = (a: number[], b: number[], k: number) => a.map((v, j) => Math.round(v + (b[j] - v) * k));
      const red = [245, 78, 0];
      const yellow = [249, 189, 43];
      const green = [45, 189, 132];
      const c = p < 0.5 ? lerp(red, yellow, p / 0.5) : lerp(yellow, green, (p - 0.5) / 0.5);
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    };

    const stop = runCanvas(canvas, ({ ctx, w, h, t }) => {
      const dt = Math.min(0.1, t - lastT) * HOURS_PER_SEC;
      lastT = t;
      hours += dt;
      rowH = Math.max(20, (h - TOP - 10) / muscles.length);

      ctx.clearRect(0, 0, w, h);
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const day = Math.floor(hours / 24);
      ctx.fillText(`day ${day + 1} · ${String(Math.floor(hours % 24)).padStart(2, '0')}:00`, w - 12, 20);

      const labelW = 92;
      const pctW = 64;
      const barX = 12 + labelW;
      const barW = Math.max(40, w - barX - pctW - 12);
      muscles.forEach((m, i) => {
        m.f *= Math.exp(-dt / m.tau);
        m.flash = Math.max(0, m.flash - 0.04);
        const rec = Math.max(0, 1 - m.f / C);
        const y = TOP + i * rowH;
        const cy = y + rowH / 2;
        if (i === hover) {
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(0, y, w, rowH);
        }
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(m.name, 12, cy);
        const bh = Math.min(12, rowH * 0.45);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.roundRect(barX, cy - bh / 2, barW, bh, bh / 2);
        ctx.fill();
        ctx.fillStyle = ramp(rec);
        ctx.beginPath();
        ctx.roundRect(barX, cy - bh / 2, Math.max(bh, barW * rec), bh, bh / 2);
        ctx.fill();
        if (m.flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${m.flash * 0.35})`;
          ctx.beginPath();
          ctx.roundRect(barX, cy - bh / 2, barW, bh, bh / 2);
          ctx.fill();
        }
        ctx.textAlign = 'right';
        ctx.fillStyle = rec >= 0.85 ? '#2dbd84' : 'rgba(255,255,255,0.6)';
        ctx.fillText(`${Math.round(rec * 100)}%${rec >= 0.85 ? ' ✓' : '  '}`, w - 12, cy);
      });
    });
    return () => {
      canvas.removeEventListener('pointerdown', onClick);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      stop();
    };
  }, []);
  return <canvas ref={ref} className='h-full w-full cursor-pointer' />;
}

export const SKETCHES: Record<string, () => React.JSX.Element> = {
  particles: Particles,
  life: GameOfLife,
  dvd: DvdBounce,
  recovery: Recovery,
};

const HINTS: Record<string, string> = {
  particles: 'Particles',
  life: "Conway's Game of Life",
  dvd: 'Will it ever hit the corner?',
  recovery: 'recovery = 100 × (1 − Σ fatigue × e^(−t/τ) / C)',
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
      <figcaption className={cn('mt-2 text-center text-[13px] text-muted-foreground')}>{caption ?? (name && HINTS[name]) ?? 'Live JS canvas'}</figcaption>
    </figure>
  );
}
