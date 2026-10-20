'use client';

import { PROJECTS_FILE } from '@/lib/admin/types';
import { PROJECT_SECTIONS, type Project, type ProjectLink, type ProjectSection } from '@/lib/eddie';
import { useAdminStore } from '@/lib/os/admin/store';
import { useContent } from '@/lib/os/content';
import { useWindowStore } from '@/lib/os/store';
import { isLocalPdf, openDocument, openVideo } from '@/lib/os/viewers';
import { youtubeId } from '@/lib/youtube';
import { ArrowUpRight, BookOpen, FileText, Play, X } from 'lucide-react';
import { AddItem, Editable } from '../editable';
import { AppScroll, Chip } from '../ui';

const F = PROJECTS_FILE;

const sectionOf = (p: Project): ProjectSection => p.section ?? 'projects';

function LinkIcon({ link }: { link: ProjectLink }) {
  if (link.kind === 'post') return <BookOpen size={15} />;
  if (link.kind === 'url' && youtubeId(link.href)) return <Play size={15} />;
  if (link.kind === 'url' && link.href.endsWith('.pdf')) return <FileText size={15} />;
  return <ArrowUpRight size={15} />;
}

export function ProjectsApp() {
  const openApp = useWindowStore((s) => s.openApp);
  const { projects, editing } = useContent();

  const openLink = (p: Project, link: ProjectLink) => {
    const video = link.kind === 'url' ? youtubeId(link.href) : null;
    if (video) openVideo(video, `${p.title} · ${link.label}`);
    else if (link.kind === 'url' && isLocalPdf(link.href)) openDocument(link.href, `${p.title} · ${link.label}`);
    else if (link.kind === 'url') window.open(link.href, '_blank', 'noopener,noreferrer');
    else if (link.kind === 'post') openApp('blog', { props: { slug: link.slug }, title: 'Blog' });
    else openApp(link.appId as Parameters<typeof openApp>[0]);
  };

  return (
    <div className='flex h-full flex-col bg-card'>
      <div className='border-b px-5 py-3.5'>
        <h1 className='text-lg font-bold leading-none'>Projects</h1>
      </div>
      <AppScroll className='flex-1 px-4 py-4'>
        {PROJECT_SECTIONS.map((section) => {
          const items = projects.map((p, i) => ({ p, i })).filter(({ p }) => sectionOf(p) === section.id);
          if (!items.length && !editing) return null;
          return (
            <section key={section.id} className='mb-6 last:mb-0'>
              <h2 className='mb-2.5 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground'>{section.label}</h2>
              <div className='grid gap-3.5 sm:grid-cols-2'>
                {items.map(({ p, i }) => (
                  <div
                    key={p.id}
                    className='group relative flex flex-col rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-12px_rgba(0,0,0,0.45)]'
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {editing ? (
                      <button
                        type='button'
                        aria-label={`Delete ${p.title}`}
                        onClick={() => useAdminStore.getState().removeJsonItem(F, String(i))}
                        className='absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground'
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                    <div className='mb-3 flex items-center gap-3'>
                      <span
                        className='grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl'
                        style={{ background: `color-mix(in oklab, ${p.accent} 18%, var(--card))`, boxShadow: `inset 0 0 0 1px ${p.accent}` }}
                      >
                        <Editable file={F} path={`${i}.emoji`} value={p.emoji} />
                      </span>
                      <div className='min-w-0'>
                        <Editable file={F} path={`${i}.title`} value={p.title} as='h2' className='truncate text-[15px] font-bold leading-tight' />
                        <p className='truncate text-xs font-semibold' style={{ color: p.accent }}>
                          <Editable file={F} path={`${i}.subtitle`} value={p.subtitle} /> · <Editable file={F} path={`${i}.year`} value={p.year} />
                        </p>
                      </div>
                    </div>

                    <Editable
                      file={F}
                      path={`${i}.description`}
                      value={p.description}
                      as='p'
                      multiline
                      className='text-[13px] leading-relaxed text-muted-foreground'
                    />

                    {editing ? (
                      <Editable
                        file={F}
                        path={`${i}.tech`}
                        value={p.tech.join(', ')}
                        parse={(t) =>
                          t
                            .split(',')
                            .map((x) => x.trim())
                            .filter(Boolean)
                        }
                        className='mt-3 text-[12px]'
                      />
                    ) : (
                      <div className='mt-3 flex flex-wrap gap-1.5'>
                        {p.tech.map((t) => (
                          <Chip key={t}>{t}</Chip>
                        ))}
                      </div>
                    )}

                    {p.links?.length ? (
                      <div className='mt-auto flex flex-wrap gap-x-4 gap-y-1.5 pt-4'>
                        {p.links.map((l, j) =>
                          editing ? (
                            <div key={`${l.label}-${j}`} className='text-[13px] font-bold' style={{ color: p.accent }}>
                              <Editable file={F} path={`${i}.links.${j}.label`} value={l.label} />
                            </div>
                          ) : (
                            <button
                              key={`${l.label}-${j}`}
                              type='button'
                              onClick={() => openLink(p, l)}
                              className='inline-flex w-fit items-center gap-1.5 text-[13px] font-bold transition hover:opacity-75'
                              style={{ color: p.accent }}
                            >
                              <LinkIcon link={l} />
                              {l.label}
                            </button>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
                {editing ? (
                  <div className='grid min-h-40 place-items-center rounded-2xl border border-dashed'>
                    <AddItem
                      file={F}
                      path=''
                      label='Add project'
                      value={{
                        id: `project-${Date.now()}`,
                        section: section.id,
                        title: 'Untitled',
                        subtitle: 'Untitled',
                        description: 'Untitled',
                        tech: [],
                        emoji: '✨',
                        accent: 'var(--brand-blue)',
                        year: String(new Date().getFullYear()),
                        links: [],
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </AppScroll>
    </div>
  );
}
