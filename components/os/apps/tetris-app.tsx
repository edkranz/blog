'use client';

import { useWindowStore } from '@/lib/os/store';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronsDown, RotateCw } from 'lucide-react';
import { useEffect, useReducer } from 'react';
import type { AppContentProps } from './types';

const COLS = 10;
const ROWS = 20;
const CELL = 19;

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
type Matrix = number[][];
type Cell = string | null;
type Board = Cell[][];
type Piece = { type: PieceType; m: Matrix; x: number; y: number };
type Status = 'playing' | 'paused' | 'over';
type Mode = 'normal' | 'angel' | 'evil';
type Game = { board: Board; piece: Piece; next: PieceType; score: number; lines: number; level: number; status: Status; mode: Mode; clearing: number[] };
type Action = 'left' | 'right' | 'rotate' | 'soft' | 'hard' | 'tick' | 'togglePause' | 'reset' | 'modeNormal' | 'modeAngel' | 'modeEvil' | 'finishClear';

const SHAPES: Record<PieceType, Matrix> = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};
const COLORS: Record<PieceType, string> = {
  I: '#29c7d6', O: '#f9bd2b', T: '#c063ff', S: '#2dbd84', Z: '#f54e00', J: '#1d4aff', L: '#ff9a3c',
};
const TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const LINE_SCORE = [0, 100, 300, 500, 800];

const emptyBoard = (): Board => Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
const randType = (): PieceType => TYPES[Math.floor(Math.random() * TYPES.length)];

function rotate(m: Matrix): Matrix {
  const n = m.length;
  const r = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) r[j][n - 1 - i] = m[i][j];
  return r;
}

function cellsOf(m: Matrix, x: number, y: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < m.length; i++) for (let j = 0; j < m[i].length; j++) if (m[i][j]) out.push([y + i, x + j]);
  return out;
}

function collides(board: Board, m: Matrix, x: number, y: number): boolean {
  for (const [r, c] of cellsOf(m, x, y)) {
    if (c < 0 || c >= COLS || r >= ROWS) return true;
    if (r >= 0 && board[r][c]) return true;
  }
  return false;
}

function spawn(type: PieceType): Piece {
  const m = SHAPES[type];
  return { type, m, x: Math.floor((COLS - m[0].length) / 2), y: type === 'I' ? -1 : 0 };
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((c) => c === null));
  const cleared = ROWS - kept.length;
  const fresh = Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(null));
  return { board: [...fresh, ...kept], cleared };
}

/** Indices of fully-filled rows — the ones about to clear (used for the flash). */
const fullRows = (board: Board): number[] => {
  const rows: number[] = [];
  for (let r = 0; r < ROWS; r++) if (board[r].every((c) => c !== null)) rows.push(r);
  return rows;
};

// ---- Evil / Angel piece selection ------------------------------------------
// Rate a board for the player (higher = better): reward cleared lines, punish
// total height, holes and bumpiness (El-Tetris-style weights).
function evalBoard(board: Board, lines: number): number {
  const h = new Array<number>(COLS).fill(0);
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c]) {
        h[c] = ROWS - r;
        break;
      }
    }
  }
  let agg = 0;
  for (const v of h) agg += v;
  let holes = 0;
  for (let c = 0; c < COLS; c++) {
    let seen = false;
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c]) seen = true;
      else if (seen) holes++;
    }
  }
  let bump = 0;
  for (let c = 0; c < COLS - 1; c++) bump += Math.abs(h[c] - h[c + 1]);
  return -0.51 * agg + 0.76 * lines - 0.36 * holes - 0.18 * bump;
}

// Hard-drop a rotated piece at column x, lock it and clear lines. null if it
// can't come to rest (out of bounds, or it overflows the top of the board).
function dropResult(board: Board, m: Matrix, x: number): { board: Board; lines: number } | null {
  let y = -m.length;
  while (!collides(board, m, x, y + 1)) y++;
  const cells = cellsOf(m, x, y);
  for (const [r, c] of cells) if (c < 0 || c >= COLS || r < 0) return null;
  const nb = board.map((row) => row.slice());
  for (const [r, c] of cells) nb[r][c] = 'x';
  const { board: out, cleared } = clearLines(nb);
  return { board: out, lines: cleared };
}

// Best board score the player could reach with a given piece (all rotations & columns).
function bestAchievable(board: Board, type: PieceType): number {
  let best = Number.NEGATIVE_INFINITY;
  let m = SHAPES[type];
  for (let rot = 0; rot < 4; rot++) {
    for (let x = -2; x <= COLS; x++) {
      const res = dropResult(board, m, x);
      if (res) {
        const s = evalBoard(res.board, res.lines);
        if (s > best) best = s;
      }
    }
    m = rotate(m);
  }
  return best;
}

// Normal → random. Evil → the piece whose best outcome is worst for the player.
// Angel → the piece whose best outcome is best. Ties broken randomly for variety.
function choosePiece(board: Board, mode: Mode): PieceType {
  if (mode === 'normal') return randType();
  const scored = TYPES.map((t) => ({ t, s: bestAchievable(board, t) }));
  const target = mode === 'evil' ? Math.min(...scored.map((p) => p.s)) : Math.max(...scored.map((p) => p.s));
  const tied = scored.filter((p) => Math.abs(p.s - target) < 1e-6).map((p) => p.t);
  return tied[Math.floor(Math.random() * tied.length)] ?? randType();
}

function lock(g: Game): Game {
  const board = g.board.map((r) => r.slice());
  for (const [r, c] of cellsOf(g.piece.m, g.piece.x, g.piece.y)) if (r >= 0) board[r][c] = COLORS[g.piece.type];
  const rows = fullRows(board);
  // If lines completed, freeze on them so they can flash; finishClear() then removes them.
  if (rows.length > 0) return { ...g, board, clearing: rows };
  const piece = spawn(g.next);
  const over = collides(board, piece.m, piece.x, piece.y);
  return { ...g, board, piece, next: choosePiece(board, g.mode), status: over ? 'over' : 'playing' };
}

function finishClear(g: Game): Game {
  if (g.clearing.length === 0) return g;
  const kept = g.board.filter((_, r) => !g.clearing.includes(r));
  const n = g.clearing.length;
  const fresh = Array.from({ length: n }, () => Array<Cell>(COLS).fill(null));
  const board = [...fresh, ...kept];
  const lines = g.lines + n;
  const piece = spawn(g.next);
  const over = collides(board, piece.m, piece.x, piece.y);
  return {
    ...g,
    board,
    piece,
    next: choosePiece(board, g.mode),
    score: g.score + LINE_SCORE[n] * g.level,
    lines,
    level: Math.floor(lines / 10) + 1,
    status: over ? 'over' : 'playing',
    clearing: [],
  };
}

function init(mode: Mode = 'normal'): Game {
  const board = emptyBoard();
  return { board, piece: spawn(choosePiece(board, mode)), next: choosePiece(board, mode), score: 0, lines: 0, level: 1, status: 'playing', mode, clearing: [] };
}

function step(g: Game, a: Action): Game {
  if (a === 'reset') return init(g.mode);
  if (a === 'modeNormal') return init('normal');
  if (a === 'modeAngel') return init('angel');
  if (a === 'modeEvil') return init('evil');
  if (a === 'finishClear') return finishClear(g);
  if (a === 'togglePause') {
    if (g.status === 'playing') return { ...g, status: 'paused' };
    if (g.status === 'paused') return { ...g, status: 'playing' };
    return g;
  }
  if (g.status !== 'playing' || g.clearing.length > 0) return g;
  const { board, piece } = g;
  const { m, x, y } = piece;
  switch (a) {
    case 'left':
      return collides(board, m, x - 1, y) ? g : { ...g, piece: { ...piece, x: x - 1 } };
    case 'right':
      return collides(board, m, x + 1, y) ? g : { ...g, piece: { ...piece, x: x + 1 } };
    case 'rotate': {
      const rm = rotate(m);
      for (const k of [0, -1, 1, -2, 2]) if (!collides(board, rm, x + k, y)) return { ...g, piece: { ...piece, m: rm, x: x + k } };
      return g;
    }
    case 'soft':
      return collides(board, m, x, y + 1) ? lock(g) : { ...g, piece: { ...piece, y: y + 1 }, score: g.score + 1 };
    case 'tick':
      return collides(board, m, x, y + 1) ? lock(g) : { ...g, piece: { ...piece, y: y + 1 } };
    case 'hard': {
      let d = 0;
      while (!collides(board, m, x, y + d + 1)) d++;
      return lock({ ...g, piece: { ...piece, y: y + d }, score: g.score + 2 * d });
    }
    default:
      return g;
  }
}

function Block({ color, size = CELL, ghost = false, flash = false }: { color: string | null; size?: number; ghost?: boolean; flash?: boolean }) {
  return (
    <div
      className={flash ? 'tetris-flash' : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        background: flash ? '#ffffff' : ghost ? 'transparent' : (color ?? 'rgba(255,255,255,0.035)'),
        boxShadow: color && !ghost && !flash ? 'inset 0 0 0 1px rgba(255,255,255,0.25), inset 1px 1px 2px rgba(255,255,255,0.4)' : undefined,
        border: ghost && color ? `2px solid ${color}66` : undefined,
      }}
    />
  );
}

function CtrlButton({ onTap, label, children }: { onTap: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type='button'
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onTap}
      className='grid h-11 flex-1 place-items-center rounded-xl border bg-card text-foreground/80 transition active:scale-95 active:bg-secondary'
    >
      {children}
    </button>
  );
}

export function TetrisApp({ win }: AppContentProps) {
  const [g, dispatch] = useReducer(step, undefined, init);
  const focused = useWindowStore((s) => s.focusedId === win.id);

  // Gravity — only runs while focused & playing, so it pauses when you switch windows.
  useEffect(() => {
    if (g.status !== 'playing' || !focused || g.clearing.length > 0) return;
    const speed = Math.max(90, 800 - (g.level - 1) * 65);
    const id = setInterval(() => dispatch('tick'), speed);
    return () => clearInterval(id);
  }, [g.status, g.level, focused, g.clearing.length]);

  // Flash completed lines briefly, then remove them.
  useEffect(() => {
    if (g.clearing.length === 0) return;
    const id = setTimeout(() => dispatch('finishClear'), 280);
    return () => clearTimeout(id);
  }, [g.clearing]);

  // Keyboard — active only while this window is focused.
  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Action> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowDown: 'soft',
        ArrowUp: 'rotate',
        x: 'rotate',
        X: 'rotate',
        ' ': 'hard',
        p: 'togglePause',
        P: 'togglePause',
        r: 'reset',
        R: 'reset',
      };
      const action = map[e.key];
      if (!action) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) e.preventDefault();
      dispatch(action);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focused]);

  // Build the display grid: locked board + ghost + active piece.
  const view: Cell[][] = g.board.map((r) => r.slice());
  const ghostCells: [number, number][] = [];
  const settling = g.clearing.length > 0;
  if (g.status !== 'over' && !settling) {
    let gy = g.piece.y;
    while (!collides(g.board, g.piece.m, g.piece.x, gy + 1)) gy++;
    for (const [r, c] of cellsOf(g.piece.m, g.piece.x, gy)) if (r >= 0 && !view[r][c]) ghostCells.push([r, c]);
  }
  const ghostSet = new Set(ghostCells.map(([r, c]) => r * COLS + c));
  if (!settling) for (const [r, c] of cellsOf(g.piece.m, g.piece.x, g.piece.y)) if (r >= 0) view[r][c] = COLORS[g.piece.type];
  const clearingSet = new Set(g.clearing);

  const overlay =
    g.status === 'over'
      ? { title: 'Game Over', sub: `Score ${g.score}`, btn: 'Play again', action: 'reset' as Action }
      : g.status === 'paused'
        ? { title: 'Paused', sub: 'Take a breather', btn: 'Resume', action: 'togglePause' as Action }
        : !focused && g.status === 'playing'
          ? { title: 'Paused', sub: 'Click to focus & play', btn: '', action: 'reset' as Action }
          : null;

  return (
    <div className='flex h-full select-none gap-3 bg-card p-3' style={{ touchAction: 'none' }}>
      {/* Playfield */}
      <div className='relative shrink-0 rounded-lg bg-[#15171c] p-1.5 shadow-inner'>
        <div className='grid' style={{ gridTemplateColumns: `repeat(${COLS}, ${CELL}px)` }}>
          {view.map((row, r) =>
            row.map((color, c) => {
              const isGhost = !color && ghostSet.has(r * COLS + c);
              return (
                <div key={`${r}-${c}`} className='p-px'>
                  <Block color={isGhost ? COLORS[g.piece.type] : color} ghost={isGhost} flash={clearingSet.has(r)} />
                </div>
              );
            }),
          )}
        </div>

        {overlay ? (
          <div className='absolute inset-1.5 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-black/70 text-center backdrop-blur-sm'>
            <div className='text-xl font-bold text-white'>{overlay.title}</div>
            <div className='text-xs text-white/70'>{overlay.sub}</div>
            {overlay.btn ? (
              <button
                type='button'
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => dispatch(overlay.action)}
                className='btn-chunky mt-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground'
              >
                {overlay.btn}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Side panel + controls */}
      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='mb-2.5 grid grid-cols-3 gap-1'>
          <ModeButton active={g.mode === 'normal'} onPick={() => dispatch('modeNormal')} emoji='🎲' label='Normal' activeTone='border-foreground/30 bg-secondary text-foreground' />
          <ModeButton active={g.mode === 'angel'} onPick={() => dispatch('modeAngel')} emoji='😇' label='Angel' activeTone='border-[var(--brand-blue)] bg-secondary text-[var(--brand-blue)]' />
          <ModeButton active={g.mode === 'evil'} onPick={() => dispatch('modeEvil')} emoji='😈' label='Evil' activeTone='border-[var(--brand-red)] bg-secondary text-[var(--brand-red)]' />
        </div>
        <div className='grid grid-cols-3 gap-1.5 text-center'>
          <Stat label='Score' value={g.score} />
          <Stat label='Lines' value={g.lines} />
          <Stat label='Level' value={g.level} />
        </div>

        <div className='mt-3'>
          <div className='mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>Next</div>
          <div className='inline-grid rounded-lg border bg-secondary/40 p-2' style={{ gridTemplateColumns: `repeat(${SHAPES[g.next][0].length}, 14px)` }}>
            {SHAPES[g.next].map((row, r) =>
              row.map((v, c) => <Block key={`n-${r}-${c}`} color={v ? COLORS[g.next] : null} size={14} />),
            )}
          </div>
        </div>

        <div className='mt-auto space-y-1.5 pt-3'>
          <div className='flex gap-1.5'>
            <CtrlButton onTap={() => dispatch('left')} label='Move left'>
              <ArrowLeft size={18} />
            </CtrlButton>
            <CtrlButton onTap={() => dispatch('rotate')} label='Rotate'>
              <RotateCw size={18} />
            </CtrlButton>
            <CtrlButton onTap={() => dispatch('right')} label='Move right'>
              <ArrowRight size={18} />
            </CtrlButton>
          </div>
          <div className='flex gap-1.5'>
            <CtrlButton onTap={() => dispatch('soft')} label='Soft drop'>
              <ChevronDown size={18} />
            </CtrlButton>
            <CtrlButton onTap={() => dispatch('hard')} label='Hard drop'>
              <ChevronsDown size={18} />
            </CtrlButton>
          </div>
          <p className='pt-1 text-center text-[10px] leading-tight text-muted-foreground'>
            ← → move · ↑ rotate · ↓ soft · space drop · P pause
          </p>
        </div>
      </div>
    </div>
  );
}

function ModeButton({ active, onPick, emoji, label, activeTone }: { active: boolean; onPick: () => void; emoji: string; label: string; activeTone: string }) {
  return (
    <button
      type='button'
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[10px] font-bold uppercase tracking-wide transition',
        active ? activeTone : 'border-transparent text-foreground/50 hover:bg-secondary/50',
      )}
    >
      <span className='text-sm leading-none'>{emoji}</span>
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-lg border bg-secondary/40 px-1 py-1.5'>
      <div className='text-[9px] font-bold uppercase tracking-wide text-muted-foreground'>{label}</div>
      <div className='font-mono text-sm font-bold tabular-nums'>{value}</div>
    </div>
  );
}
