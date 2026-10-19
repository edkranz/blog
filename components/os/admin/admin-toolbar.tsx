'use client';

import type { PreviewState } from '@/lib/admin/types';
import { confirmAction } from '@/lib/os/admin/dialog-store';
import { useAdminStore } from '@/lib/os/admin/store';
import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

/** The draft head's preview, polled while Vercel builds it. */
function usePreview(branch: string, head: string | null, enabled: boolean): PreviewState | null {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  useEffect(() => {
    setPreview(null);
    if (!enabled || !head) return;
    let stopped = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/admin/preview?branch=${encodeURIComponent(branch)}`, { cache: 'no-store' });
        if (res.ok) {
          const p = (await res.json()) as PreviewState;
          if (stopped) return;
          setPreview(p);
          if (p.state !== 'building') return;
        }
      } catch {}
      if (!stopped && ++tries < 60) timer = setTimeout(tick, 10_000);
    };
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [branch, head, enabled]);
  return preview;
}

const btn = 'h-[22px] whitespace-nowrap rounded-md px-2 text-[12px] font-semibold transition disabled:opacity-50';
const primary = `${btn} bg-primary text-primary-foreground hover:opacity-90`;
const secondary = `${btn} border border-foreground/15 hover:bg-foreground/5`;

/** Save, Deploy preview and Push to main, in the menu bar (admin only). */
export function AdminToolbar() {
  const session = useAdminStore((s) => s.session);
  const count = useAdminStore((s) => Object.keys(s.pending).length);
  const branch = useAdminStore((s) => s.branch);
  const head = useAdminStore((s) => s.head);
  const loaded = useAdminStore((s) => !!s.remote);
  const busy = useAdminStore((s) => s.busy);
  const error = useAdminStore((s) => s.error);
  const onDraft = branch !== 'main';
  const preview = usePreview(branch, head, loaded && onDraft && count === 0);
  if (!session) return null;

  const { save, deployPreview, publish, load } = useAdminStore.getState();

  return (
    <div className='flex items-center gap-1.5'>
      {error ? (
        <span title={error} className='max-w-[260px] truncate font-medium text-destructive'>
          {error}
        </span>
      ) : null}
      {error?.endsWith('branch moved') ? (
        <button type='button' onClick={() => void load(branch)} className={secondary}>
          Reload
        </button>
      ) : null}
      {count > 0 ? (
        <>
          <span className='hidden whitespace-nowrap text-muted-foreground sm:inline'>
            {count} change{count === 1 ? '' : 's'}
          </span>
          <button type='button' disabled={!!busy} onClick={() => void save()} className={primary}>
            {busy === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </>
      ) : onDraft && loaded ? (
        <>
          {preview?.state === 'ready' ? (
            <a href={preview.url} target='_blank' rel='noopener noreferrer' className={`${secondary} inline-flex items-center gap-1`}>
              Preview <ExternalLink size={11} />
            </a>
          ) : preview?.state === 'building' ? (
            <span className='whitespace-nowrap text-muted-foreground'>Building…</span>
          ) : preview ? (
            <button
              type='button'
              disabled={!!busy}
              onClick={() => void deployPreview()}
              title={preview.state === 'failed' ? 'The last preview build failed' : undefined}
              className={secondary}
            >
              {busy === 'deploying' ? 'Deploying…' : preview.state === 'failed' ? 'Retry preview' : 'Deploy preview'}
            </button>
          ) : null}
          <button
            type='button'
            disabled={!!busy}
            onClick={async () => {
              if (await confirmAction(`Push ${branch} to main?`, 'Push')) await publish();
            }}
            className={primary}
          >
            {busy === 'publishing' ? 'Pushing…' : 'Push to main'}
          </button>
        </>
      ) : null}
    </div>
  );
}
