'use client';

import { cn } from '@/lib/utils';
import { Flag } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const COLS = 9;
const ROWS = 9;
const MINES = 10;
const SIZE = COLS * ROWS;

type Cell = { mine: boolean; revealed: boolean; flagged: boolean; adj: number; boom?: boolean };
type Status = 'ready' | 'playing' | 'won' | 'lost';

const NUM_COLOR = [
  '',
  'var(--brand-blue)',
  'var(--brand-green)',
  'var(--brand-red)',
  '#161a5e',
  '#8a1f1f',
  '#2aa7a7',
  '#1d1f27',
  '#777',
];

const fresh = (): Cell[] => Array.from({ length: SIZE }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 }));

function neighbors(i: number): number[] {
  const r = Math.floor(i / COLS);
  const c = i % COLS;
  const res: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) res.push(nr * COLS + nc);
    }
  }
  return res;
}

function placeMines(safe: number): Cell[] {
  const safeSet = new Set([safe, ...neighbors(safe)]);
  const pool: number[] = [];
  for (let i = 0; i < SIZE; i++) if (!safeSet.has(i)) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const mineIdx = new Set(pool.slice(0, MINES));
  const board = fresh();
  for (const i of mineIdx) board[i].mine = true;
  for (let i = 0; i < SIZE; i++) {
    if (board[i].mine) continue;
    board[i].adj = neighbors(i).filter((n) => board[n].mine).length;
  }
  return board;
}

function flood(start: number, source: Cell[]): Cell[] {
  const b = source.map((c) => ({ ...c }));
  const stack = [start];
  while (stack.length) {
    const i = stack.pop() as number;
    const cell = b[i];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adj === 0 && !cell.mine) for (const n of neighbors(i)) if (!b[n].revealed) stack.push(n);
  }
  return b;
}

const LED = ({ value }: { value: number }) => (
  <span className='rounded-[3px] bg-black px-1.5 py-0.5 font-mono text-[19px] font-bold leading-none tracking-wider text-[#ff3b30] tabular-nums'>
    {String(Math.max(0, Math.min(999, value))).padStart(3, '0')}
  </span>
);

const RAISED = { boxShadow: 'inset 2px 2px 0 #efeee9, inset -2px -2px 0 #95948b', background: '#cdccc4' } as const;
const SUNKEN = { boxShadow: 'inset 2px 2px 0 #95948b, inset -2px -2px 0 #efeee9' } as const;

export function MinesweeperApp() {
  const [board, setBoard] = useState<Cell[]>(fresh);
  const [status, setStatus] = useState<Status>('ready');
  const [time, setTime] = useState(0);
  const [flagMode, setFlagMode] = useState(false);

  const flags = useMemo(() => board.filter((c) => c.flagged).length, [board]);

  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => setTime((t) => Math.min(999, t + 1)), 1000);
    return () => clearInterval(id);
  }, [status]);

  const reset = useCallback(() => {
    setBoard(fresh());
    setStatus('ready');
    setTime(0);
  }, []);

  const toggleFlag = useCallback(
    (i: number) => {
      if (status === 'won' || status === 'lost') return;
      setBoard((prev) => {
        if (prev[i].revealed) return prev;
        const b = prev.map((c) => ({ ...c }));
        b[i].flagged = !b[i].flagged;
        return b;
      });
    },
    [status],
  );

  const reveal = useCallback(
    (i: number) => {
      if (status === 'won' || status === 'lost') return;
      if (flagMode) {
        toggleFlag(i);
        return;
      }
      if (board[i].flagged) return;

      let working = board;
      let nextStatus: Status = status;
      if (status === 'ready') {
        working = placeMines(i);
        nextStatus = 'playing';
      }

      if (working[i].mine) {
        const b = working.map((c) => ({ ...c, revealed: c.mine ? true : c.revealed }));
        b[i] = { ...b[i], revealed: true, boom: true };
        setBoard(b);
        setStatus('lost');
        return;
      }

      const opened = flood(i, working);
      const won = opened.every((c) => c.mine || c.revealed);
      if (won) {
        setBoard(opened.map((c) => (c.mine ? { ...c, flagged: true } : c)));
        setStatus('won');
      } else {
        setBoard(opened);
        if (nextStatus !== status) setStatus(nextStatus);
      }
    },
    [board, status, flagMode, toggleFlag],
  );

  const face = status === 'lost' ? '😵' : status === 'won' ? '😎' : '🙂';

  return (
    <div className='flex h-full select-none flex-col items-center bg-[#cdccc4] p-3' style={{ touchAction: 'manipulation' }}>
      {/* Header */}
      <div className='mb-3 flex w-full items-center justify-between rounded-[4px] px-3 py-2' style={SUNKEN}>
        <LED value={MINES - flags} />
        <button
          type='button'
          onClick={reset}
          aria-label='New game'
          className='grid h-9 w-9 place-items-center rounded-[5px] text-xl active:translate-y-px'
          style={RAISED}
        >
          {face}
        </button>
        <LED value={time} />
      </div>

      {/* Board */}
      <div
        className='rounded-[3px] p-1.5'
        style={{ ...SUNKEN, background: '#bdbcb2' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className='grid' style={{ gridTemplateColumns: `repeat(${COLS}, 30px)` }}>
          {board.map((cell, i) => {
            const showNum = cell.revealed && !cell.mine && cell.adj > 0;
            return (
              <button
                key={i}
                type='button'
                onClick={() => reveal(i)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleFlag(i);
                }}
                className={cn('grid h-[30px] w-[30px] place-items-center text-[15px] font-bold leading-none')}
                style={
                  cell.revealed
                    ? { boxShadow: 'inset 0 0 0 1px #b0afa5', background: cell.boom ? 'var(--brand-red)' : '#d6d5cd' }
                    : RAISED
                }
              >
                {cell.flagged ? (
                  <span className='text-[14px]'>🚩</span>
                ) : cell.revealed && cell.mine ? (
                  <span className='text-[15px]'>💣</span>
                ) : showNum ? (
                  <span style={{ color: NUM_COLOR[cell.adj] }}>{cell.adj}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer controls */}
      <div className='mt-3 flex w-full items-center justify-between'>
        <button
          type='button'
          onClick={() => setFlagMode((f) => !f)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-[13px] font-bold transition',
            flagMode ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/12 text-[var(--brand-red)]' : 'border-[#95948b]/40 text-[#5b5a52]',
          )}
        >
          <Flag size={14} /> Flag {flagMode ? 'ON' : 'OFF'}
        </button>
        <span className='text-[12px] font-semibold text-[#5b5a52]'>
          {status === 'won' ? '🎉 You win!' : status === 'lost' ? '💥 Boom! Try again' : 'Right-click to flag'}
        </span>
      </div>
    </div>
  );
}
