'use client';
import * as React from 'react';
import type { Template } from 'tinacms';

type LiquidProps = {
  data: {
    height?: string;
    background?: string;
    showFps?: boolean;
    hideCursor?: boolean;
    numBalls?: number;
    blobRadius?: number;
    renderResolution?: number;
    isoThreshold?: number;
    showBalls?: boolean;
    attractionStrength?: number;
    cursorRepelRadius?: number;
    cursorRepelStrength?: number;
  };
};

export const Liquid: React.FC<LiquidProps> = ({ data }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const fpsRef = React.useRef<HTMLDivElement | null>(null);
  const animationRef = React.useRef<number | null>(null);
  const config = React.useMemo(() => ({
    height: data.height || '100vh',
    background: data.background || '#0f172a',
    showFps: data.showFps ?? true,
    hideCursor: data.hideCursor ?? true,
    numBalls: Math.max(1, Math.floor(data.numBalls ?? 150)),
    blobRadius: Math.max(1, data.blobRadius ?? 20),
    renderResolution: Math.max(1, data.renderResolution ?? 3),
    isoThreshold: data.isoThreshold ?? 1.0,
    showBalls: data.showBalls ?? false,
    attractionStrength: data.attractionStrength ?? 0.5,
    cursorRepelRadius: data.cursorRepelRadius ?? 60,
    cursorRepelStrength: data.cursorRepelStrength ?? 22,
  }), [data]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const canvasEl: HTMLCanvasElement = canvas;
    const ctx2: CanvasRenderingContext2D = ctx as CanvasRenderingContext2D;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameTimes: number[] = [];
    let fps = 0;
    let isSpawning = false;
    let isSucking = false;

    const SHOW_BALLS = !!config.showBalls;
    const ISO_THRESHOLD = config.isoThreshold;
    const RENDER_RESOLUTION = config.renderResolution;
    const KILL_RADIUS = 10;
    const VACUUM_INVERSE_SQUARE_STRENGTH = 3000;

    const mouse = { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0 };

    class Ball {
      x: number; y: number; px: number; py: number; vx: number; vy: number; r: number; mass: number; color: string;
      constructor(x: number, y: number, r: number) {
        this.x = x; this.y = y; this.px = x; this.py = y; this.vx = 0; this.vy = 0; this.r = r; this.mass = r;
        this.color = `hsl(${Math.random() * 360}, 90%, 65%)`;
      }
      update() {
        this.vx = this.x - this.px;
        this.vy = this.y - this.py;
        this.px = this.x;
        this.py = this.y;
        this.vx *= 0.97;
        this.vy *= 0.97;
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < this.r) { this.x = this.r; this.vx *= -0.5; }
        if (this.x > width - this.r) { this.x = width - this.r; this.vx *= -0.5; }
        if (this.y < this.r) { this.y = this.r; this.vy *= -0.5; }
        if (this.y > height - this.r) { this.y = height - this.r; this.vy *= -0.5; }
      }
    }

    const balls: Ball[] = [];

    function setCanvasSize() {
      const rect = canvasEl.getBoundingClientRect();
      dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      canvasEl.width = Math.floor(width * dpr);
      canvasEl.height = Math.floor(height * dpr);
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seedBalls() {
      balls.length = 0;
      for (let i = 0; i < config.numBalls; i++) {
        const r = config.blobRadius;
        const x = Math.random() * (width - 2 * r) + r;
        const y = Math.random() * (height - 2 * r) + r;
        balls.push(new Ball(x, y, r));
      }
    }

    function applyAttractionForces() {
      const G = config.attractionStrength;
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i];
          const b = balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          let distSq = dx * dx + dy * dy;
          const minSafe = (a.r + b.r) * (a.r + b.r);
          if (distSq < minSafe) distSq = minSafe;
          const dist = Math.sqrt(distSq);
          const force = (G * a.mass * b.mass) / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.x += fx / a.mass;
          a.y += fy / a.mass;
          b.x -= fx / b.mass;
          b.y -= fy / b.mass;
        }
      }
    }

    function applyCursorRepelForce() {
      if (isSucking) return;
      const rr = config.cursorRepelRadius;
      const rs = config.cursorRepelStrength;
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        const dx = b.x - mouse.x;
        const dy = b.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < rr && dist > 0.001) {
          const ang = Math.atan2(dy, dx);
          const forceMag = ((rr - dist) / rr) * rs;
          const acc = forceMag / b.mass;
          b.x += Math.cos(ang) * acc;
          b.y += Math.sin(ang) * acc;
        }
      }
    }

    function handleMouseInteractions() {
      if (isSpawning && fps >= 30) {
        const r = config.blobRadius;
        const nb = new Ball(mouse.x, mouse.y, r);
        const ang = Math.random() * Math.PI * 2;
        const speed = 2;
        nb.vx = Math.cos(ang) * speed;
        nb.vy = Math.sin(ang) * speed;
        balls.push(nb);
      }
      if (isSucking) {
        for (let i = balls.length - 1; i >= 0; i--) {
          const b = balls[i];
          const dx = mouse.x - b.x;
          const dy = mouse.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < KILL_RADIUS * KILL_RADIUS) {
            balls.splice(i, 1);
          } else {
            const dist = Math.sqrt(distSq);
            const force = VACUUM_INVERSE_SQUARE_STRENGTH / distSq;
            const ax = (dx / dist) * force;
            const ay = (dy / dist) * force;
            b.x += ax;
            b.y += ay;
          }
        }
      }
    }

    function handleCollisions() {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i];
          const b = balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const minDist = a.r + b.r;
          if (dist < minDist && dist > 0.001) {
            const ang = Math.atan2(dy, dx);
            const overlap = minDist - dist;
            const total = a.mass + b.mass;
            const oa = overlap * (b.mass / total);
            const ob = overlap * (a.mass / total);
            a.x -= Math.cos(ang) * oa;
            a.y -= Math.sin(ang) * oa;
            b.x += Math.cos(ang) * ob;
            b.y += Math.sin(ang) * ob;
          }
        }
      }
    }

    let grid: number[][] = [];
    let cols = 0, rows = 0;
    function calculateGrid() {
      cols = Math.floor(width / RENDER_RESOLUTION) + 1;
      rows = Math.floor(height / RENDER_RESOLUTION) + 1;
      grid = new Array(cols);
      for (let i = 0; i < cols; i++) {
        grid[i] = new Array(rows);
        for (let j = 0; j < rows; j++) {
          let value = 0;
          const gx = i * RENDER_RESOLUTION;
          const gy = j * RENDER_RESOLUTION;
          for (let k = 0; k < balls.length; k++) {
            const b = balls[k];
            const dx = gx - b.x;
            const dy = gy - b.y;
            value += (b.r * b.r) / (dx * dx + dy * dy);
          }
          grid[i][j] = value;
        }
      }
    }

    function lerp(a: number, b: number) { return (ISO_THRESHOLD - a) / (b - a); }

    function drawIsolines() {
      ctx2.strokeStyle = '#f8fafc';
      ctx2.lineWidth = 3;
      for (let i = 0; i < cols - 1; i++) {
        for (let j = 0; j < rows - 1; j++) {
          const x = i * RENDER_RESOLUTION;
          const y = j * RENDER_RESOLUTION;
          const v00 = grid[i][j];
          const v10 = grid[i + 1][j];
          const v11 = grid[i + 1][j + 1];
          const v01 = grid[i][j + 1];
          let state = 0;
          if (v00 > ISO_THRESHOLD) state |= 8;
          if (v10 > ISO_THRESHOLD) state |= 4;
          if (v11 > ISO_THRESHOLD) state |= 2;
          if (v01 > ISO_THRESHOLD) state |= 1;
          const a = { x: x + lerp(v00, v10) * RENDER_RESOLUTION, y };
          const b = { x: x + RENDER_RESOLUTION, y: y + lerp(v10, v11) * RENDER_RESOLUTION };
          const c = { x: x + lerp(v01, v11) * RENDER_RESOLUTION, y: y + RENDER_RESOLUTION };
          const d = { x, y: y + lerp(v00, v01) * RENDER_RESOLUTION };
          ctx2.beginPath();
          switch (state) {
            case 1: case 14: ctx2.moveTo(d.x, d.y); ctx2.lineTo(c.x, c.y); break;
            case 2: case 13: ctx2.moveTo(c.x, c.y); ctx2.lineTo(b.x, b.y); break;
            case 3: case 12: ctx2.moveTo(d.x, d.y); ctx2.lineTo(b.x, b.y); break;
            case 4: case 11: ctx2.moveTo(a.x, a.y); ctx2.lineTo(b.x, b.y); break;
            case 5: ctx2.moveTo(d.x, d.y); ctx2.lineTo(a.x, a.y); ctx2.moveTo(c.x, c.y); ctx2.lineTo(b.x, b.y); break;
            case 6: case 9: ctx2.moveTo(a.x, a.y); ctx2.lineTo(c.x, c.y); break;
            case 7: case 8: ctx2.moveTo(d.x, d.y); ctx2.lineTo(a.x, a.y); break;
            case 10: ctx2.moveTo(d.x, d.y); ctx2.lineTo(c.x, c.y); ctx2.moveTo(a.x, a.y); ctx2.lineTo(b.x, b.y); break;
          }
          ctx2.stroke();
        }
      }
    }

    function drawCursor() {
      if (!config.hideCursor) return;
      const color = isSucking ? '#ef4444' : (isSpawning ? '#22c55e' : '#f8fafc');
      if (isSucking) {
        ctx2.beginPath();
        ctx2.arc(mouse.x, mouse.y, KILL_RADIUS, 0, Math.PI * 2);
        ctx2.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx2.fill();
      }
      ctx2.beginPath();
      ctx2.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
      ctx2.fillStyle = color;
      ctx2.fill();
    }

    function animate() {
      animationRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      while (frameTimes.length > 0 && frameTimes[0] <= now - 1000) frameTimes.shift();
      frameTimes.push(now);
      fps = frameTimes.length;
      if (fpsRef.current && config.showFps) fpsRef.current.textContent = `FPS: ${fps}`;
      ctx2.clearRect(0, 0, width, height);
      ctx2.fillStyle = config.background as string;
      ctx2.fillRect(0, 0, width, height);
      applyCursorRepelForce();
      handleMouseInteractions();
      applyAttractionForces();
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        b.update();
        if (SHOW_BALLS) {
          ctx2.beginPath();
          ctx2.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx2.fillStyle = b.color as string;
          ctx2.fill();
        }
      }
      handleCollisions();
      calculateGrid();
      drawIsolines();
      drawCursor();
    }

    function onResize() {
      setCanvasSize();
      if (balls.length === 0) seedBalls();
    }

    function onMouseMove(e: MouseEvent) {
      const rect = canvasEl.getBoundingClientRect();
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.vx = mouse.x - mouse.px;
      mouse.vy = mouse.y - mouse.py;
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button === 0) isSpawning = true;
      if (e.button === 2) isSucking = true;
    }
    function onMouseUp(e: MouseEvent) {
      if (e.button === 0) isSpawning = false;
      if (e.button === 2) isSucking = false;
    }
    function onContextMenu(e: MouseEvent) { e.preventDefault(); }

    setCanvasSize();
    seedBalls();
    animate();

    window.addEventListener('resize', onResize);
    canvasEl.addEventListener('mousemove', onMouseMove);
    canvasEl.addEventListener('mousedown', onMouseDown);
    canvasEl.addEventListener('mouseup', onMouseUp);
    canvasEl.addEventListener('contextmenu', onContextMenu);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', onResize);
      canvasEl.removeEventListener('mousemove', onMouseMove);
      canvasEl.removeEventListener('mousedown', onMouseDown);
      canvasEl.removeEventListener('mouseup', onMouseUp);
      canvasEl.removeEventListener('contextmenu', onContextMenu);
    };
  }, [config]);

  return (
    <div className={(data.hideCursor ? 'cursor-none ' : '') + 'relative w-full'} style={{ backgroundColor: data.background || '#0f172a', height: data.height || '100vh' }}>
      {data.showFps && (
        <div ref={fpsRef} className="fixed top-2 left-2 z-10 font-mono text-white">FPS: 0</div>
      )}
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export const liquidBlockSchema: Template = {
  name: 'liquid',
  label: 'Liquid',
  ui: {
    previewSrc: '/blocks/video.png',
    defaultItem: {
      height: '100vh',
      background: '#0f172a',
      showFps: true,
      hideCursor: true,
      numBalls: 150,
      blobRadius: 20,
      renderResolution: 3,
      isoThreshold: 1.0,
      showBalls: false,
      attractionStrength: 0.5,
      cursorRepelRadius: 60,
      cursorRepelStrength: 22,
    },
  },
  fields: [
    { type: 'string', name: 'height', label: 'Height (e.g. 100vh)' },
    { type: 'string', name: 'background', label: 'Background Color' },
    { type: 'boolean', name: 'showFps', label: 'Show FPS' },
    { type: 'boolean', name: 'hideCursor', label: 'Hide Cursor Over Block' },
    { type: 'number', name: 'numBalls', label: 'Number of Blobs' },
    { type: 'number', name: 'blobRadius', label: 'Blob Radius (Zoom)' },
    { type: 'number', name: 'renderResolution', label: 'Render Resolution' },
    { type: 'number', name: 'isoThreshold', label: 'Isosurface Threshold' },
    { type: 'boolean', name: 'showBalls', label: 'Debug: Show Particles' },
    { type: 'number', name: 'attractionStrength', label: 'Attraction Strength' },
    { type: 'number', name: 'cursorRepelRadius', label: 'Cursor Repel Radius' },
    { type: 'number', name: 'cursorRepelStrength', label: 'Cursor Repel Strength' },
  ],
};


