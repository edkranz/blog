'use client';

import { ISSUES_URL, type Issue, NEW_ISSUE_URL, fetchIssues } from '@/lib/github-issues';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { Check, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppScroll, Chunky, SectionLabel } from '../ui';

const ago = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true });

function Row({ issue }: { issue: Issue }) {
  const done = issue.state === 'closed';
  return (
    <li>
      <a
        href={issue.url}
        target='_blank'
        rel='noopener noreferrer'
        className='group flex items-start gap-3 rounded-xl px-2.5 py-2 transition hover:bg-secondary/70'
      >
        <span
          className={cn(
            'mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-2',
            done ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/35 bg-card'
          )}
          aria-hidden
        >
          {done ? <Check size={12} strokeWidth={3.5} /> : null}
        </span>
        <span className='min-w-0 flex-1'>
          <span className={cn('block text-[14px] leading-snug', done ? 'text-muted-foreground line-through decoration-foreground/40' : 'font-medium')}>
            {issue.title}
          </span>
          <span className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-muted-foreground'>
            <span>#{issue.number}</span>
            <span>{done && issue.closedAt ? ago(issue.closedAt) : ago(issue.createdAt)}</span>
            {issue.labels.map((l) => (
              <span key={l.name} className='inline-flex items-center gap-1'>
                <span className='h-2 w-2 rounded-full' style={{ background: `#${l.color}` }} />
                {l.name}
              </span>
            ))}
          </span>
        </span>
      </a>
    </li>
  );
}

function Skeleton() {
  return (
    <ul className='space-y-1.5 px-2.5'>
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className='flex items-center gap-3 py-2'>
          <span className='h-[18px] w-[18px] rounded-[5px] bg-secondary' />
          <span className='h-3.5 rounded bg-secondary' style={{ width: `${55 + ((i * 17) % 35)}%` }} />
        </li>
      ))}
    </ul>
  );
}

export function TodoApp() {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchIssues()
      .then((list) => alive && setIssues(list))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const open = (issues ?? []).filter((i) => i.state === 'open').sort((a, b) => a.number - b.number);
  const done = (issues ?? []).filter((i) => i.state === 'closed').sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));

  return (
    <div className='flex h-full flex-col bg-card'>
      <div className='flex items-center justify-between gap-3 border-b px-5 py-3'>
        <h1 className='text-lg font-bold leading-none'>Todo</h1>
        <Chunky variant='primary' href={NEW_ISSUE_URL} external className='px-3 py-1.5 text-[13px]'>
          <Plus size={15} strokeWidth={2.5} /> Suggest a feature
        </Chunky>
      </div>

      <AppScroll className='flex-1 px-3 py-4'>
        {issues === null && !failed ? <Skeleton /> : null}
        {failed ? <p className='px-2.5 py-8 text-center text-sm text-muted-foreground'>Couldn't reach GitHub.</p> : null}

        {issues ? (
          <>
            <div className='px-2.5'>
              <SectionLabel>Todo</SectionLabel>
            </div>
            {open.length ? (
              <ul className='space-y-0.5'>
                {open.map((i) => (
                  <Row key={i.number} issue={i} />
                ))}
              </ul>
            ) : (
              <p className='px-2.5 py-3 text-sm text-muted-foreground'>Nothing to do.</p>
            )}

            {done.length ? (
              <>
                <div className='mt-6 px-2.5'>
                  <SectionLabel>Done</SectionLabel>
                </div>
                <ul className='space-y-0.5'>
                  {done.map((i) => (
                    <Row key={i.number} issue={i} />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : null}
      </AppScroll>

      <div className='border-t px-5 py-2 text-[11.5px] text-muted-foreground'>
        <a href={ISSUES_URL} target='_blank' rel='noopener noreferrer' className='hover:text-foreground'>
          {open.length} open · {done.length} done · GitHub
        </a>
      </div>
    </div>
  );
}
