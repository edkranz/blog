'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AppScroll } from '../ui';

const JUNK = ['old-design.psd', 'tinacms (deprecated)', 'final_FINAL_v3.fig', 'todo-someday.txt', 'bugs-from-my-motorbike.log'];

export function TrashApp() {
  const [items, setItems] = useState(JUNK);

  return (
    <AppScroll className='bg-card'>
      <div className='px-6 py-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-lg font-bold'>Trash</h1>
          {items.length > 0 ? (
            <button
              type='button'
              onClick={() => setItems([])}
              className='rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition hover:bg-secondary'
            >
              Empty Trash
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-14 text-center'>
            <Trash2 size={48} className='text-muted-foreground/50' />
            <p className='mt-3 text-sm font-semibold text-muted-foreground'>Trash is empty</p>
            <p className='text-xs text-muted-foreground/80'>Spotless. Just how we like it. ✨</p>
          </div>
        ) : (
          <ul className='mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4'>
            {items.map((f) => (
              <li key={f} className='flex flex-col items-center gap-1.5 text-center'>
                <span className='grid h-12 w-12 place-items-center rounded-lg border bg-secondary/50 text-xl'>📄</span>
                <span className='line-clamp-2 text-[11px] text-muted-foreground'>{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppScroll>
  );
}
