'use client';

import { defaultMessage } from '@/lib/admin/messages';
import { confirmAction } from '@/lib/os/admin/dialog-store';
import { useAdminStore } from '@/lib/os/admin/store';
import { ExternalLink, GitBranch } from 'lucide-react';
import { useEffect, useState } from 'react';

function usePreviewUrl(branch: string, head: string | null, enabled: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!enabled || !head) return;
    let stopped = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/admin/preview?branch=${encodeURIComponent(branch)}`, { cache: 'no-store' });
        const data = (await res.json()) as { url?: string | null };
        if (!stopped && data.url) return setUrl(data.url);
      } catch {}
      if (!stopped && ++tries < 40) timer = setTimeout(tick, 15_000);
    };
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [branch, head, enabled]);
  return url;
}

export function SaveBar() {
  const pending = useAdminStore((s) => s.pending);
  const branch = useAdminStore((s) => s.branch);
  const head = useAdminStore((s) => s.head);
  const busy = useAdminStore((s) => s.busy);
  const error = useAdminStore((s) => s.error);
  const [message, setMessage] = useState('');

  const changes = Object.values(pending);
  const count = changes.length;
  const onDraft = branch !== 'main';
  const preview = usePreviewUrl(branch, head, onDraft && count === 0);
  if (count === 0 && !onDraft && !error) return null;

  const { save, discard, load, publish } = useAdminStore.getState();
  const suggested = count ? defaultMessage(changes) : '';
  const btn = 'rounded-lg px-2.5 py-1 font-semibold transition disabled:opacity-50';

  return (
    <div
      className='os-panel fixed bottom-[92px] left-1/2 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-2xl border px-3 py-2 text-[13px] shadow-xl'
      style={{ zIndex: 9400 }}
    >
      <GitBranch size={14} className='shrink-0 text-muted-foreground' />
      <span className='font-semibold'>{branch}</span>
      {count > 0 ? (
        <>
          <span className='whitespace-nowrap text-muted-foreground'>
            {count} change{count === 1 ? '' : 's'}
          </span>
          <input
            aria-label='Commit message'
            value={message}
            placeholder={suggested}
            onChange={(e) => setMessage(e.target.value)}
            className='w-56 min-w-0 rounded-lg border bg-card px-2 py-1 outline-none focus:border-primary'
          />
          <button type='button' disabled={!!busy} onClick={discard} className={`${btn} border hover:bg-secondary`}>
            Discard
          </button>
          <button
            type='button'
            disabled={!!busy}
            onClick={async () => {
              if (await save(message.trim() || suggested)) setMessage('');
            }}
            className={`${btn} bg-primary text-primary-foreground`}
          >
            {busy === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </>
      ) : onDraft ? (
        <>
          {preview ? (
            <a href={preview} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 font-semibold text-primary hover:underline'>
              Preview <ExternalLink size={12} />
            </a>
          ) : (
            <span className='text-muted-foreground'>Building…</span>
          )}
          <button
            type='button'
            disabled={!!busy}
            onClick={async () => {
              if (await confirmAction(`Publish ${branch} to main?`, 'Publish')) await publish();
            }}
            className={`${btn} bg-primary text-primary-foreground`}
          >
            {busy === 'publishing' ? 'Publishing…' : 'Publish to main'}
          </button>
        </>
      ) : null}
      {error ? (
        <span className='flex items-center gap-2 text-destructive'>
          {error}
          {error.endsWith('branch moved') ? (
            <button type='button' onClick={() => void load(branch)} className={`${btn} border text-foreground hover:bg-secondary`}>
              Reload
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
