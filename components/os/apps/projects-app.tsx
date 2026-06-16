'use client';

import { type Project, projects } from '@/lib/eddie';
import { useWindowStore } from '@/lib/os/store';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { AppScroll, Chip } from '../ui';

export function ProjectsApp() {
  const openApp = useWindowStore((s) => s.openApp);

  const openLink = (p: Project) => {
    const link = p.link;
    if (!link) return;
    if (link.kind === 'url') window.open(link.href, '_blank', 'noopener,noreferrer');
    else if (link.kind === 'post') openApp('blog', { props: { slug: link.slug }, title: 'Blog' });
    else openApp(link.appId as Parameters<typeof openApp>[0]);
  };

  return (
    <div className='flex h-full flex-col bg-card'>
      <div className='border-b px-5 py-3.5'>
        <h1 className='text-lg font-bold leading-none'>Projects</h1>
        <p className='mt-1 text-xs text-muted-foreground'>A few things I&apos;ve built, researched & tinkered with.</p>
      </div>
      <AppScroll className='flex-1 px-4 py-4'>
        <div className='grid gap-3.5 sm:grid-cols-2'>
          {projects.map((p) => (
            <div
              key={p.id}
              className='group flex flex-col rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-12px_rgba(0,0,0,0.45)]'
              style={{ borderColor: 'var(--border)' }}
            >
              <div className='mb-3 flex items-center gap-3'>
                <span
                  className='grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl'
                  style={{ background: `color-mix(in oklab, ${p.accent} 18%, var(--card))`, boxShadow: `inset 0 0 0 1px ${p.accent}` }}
                >
                  {p.emoji}
                </span>
                <div className='min-w-0'>
                  <h2 className='truncate text-[15px] font-bold leading-tight'>{p.title}</h2>
                  <p className='truncate text-xs font-semibold' style={{ color: p.accent }}>
                    {p.subtitle} · {p.year}
                  </p>
                </div>
              </div>

              <p className='text-[13px] leading-relaxed text-muted-foreground'>{p.description}</p>

              <div className='mt-3 flex flex-wrap gap-1.5'>
                {p.tech.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>

              {p.link ? (
                <button
                  type='button'
                  onClick={() => openLink(p)}
                  className='mt-4 inline-flex w-fit items-center gap-1.5 text-[13px] font-bold transition'
                  style={{ color: p.accent }}
                >
                  {p.link.kind === 'post' ? <BookOpen size={15} /> : <ArrowUpRight size={15} />}
                  {p.link.label}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </AppScroll>
    </div>
  );
}
