'use client';

import { useDialogStore } from '@/lib/os/admin/dialog-store';
import { useEffect, useRef, useState } from 'react';

export function AdminDialog() {
  const req = useDialogStore((s) => s.req);
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!req) return;
    setValue(req.initial);
    requestAnimationFrame(() => input.current?.focus());
  }, [req]);

  if (!req) return null;
  const close = (result: string | boolean | null) => {
    useDialogStore.setState({ req: null });
    req.resolve(result);
  };
  const ok = () => close(req.kind === 'prompt' ? value.trim() || null : true);

  return (
    <div className='fixed inset-0 grid place-items-center bg-black/25' style={{ zIndex: 9900 }} onPointerDown={() => close(req.kind === 'prompt' ? null : false)}>
      <form
        role='dialog'
        aria-label={req.title}
        className='os-panel w-[320px] rounded-2xl border p-4 shadow-2xl'
        onPointerDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          ok();
        }}
        onKeyDown={(e) => e.key === 'Escape' && close(req.kind === 'prompt' ? null : false)}
      >
        <h2 className='text-[14px] font-bold'>{req.title}</h2>
        {req.kind === 'prompt' ? (
          <input
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className='mt-3 w-full rounded-lg border bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-primary'
          />
        ) : null}
        <div className='mt-4 flex justify-end gap-2 text-[13px]'>
          <button type='button' onClick={() => close(req.kind === 'prompt' ? null : false)} className='rounded-lg border px-3 py-1 font-semibold hover:bg-secondary'>
            Cancel
          </button>
          <button type='submit' className='rounded-lg bg-primary px-3 py-1 font-semibold text-primary-foreground'>
            {req.okLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
