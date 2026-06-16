'use client';

import { useWindowStore } from '@/lib/os/store';
import type { Post } from '@/lib/posts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, CalendarDays, Clock, Rss } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MarkdownContent } from '../blog-content';
import { useOSData } from '../os-context';
import { AppScroll, Chip } from '../ui';
import type { AppContentProps } from './types';

function PostMeta({ post }: { post: Post }) {
  return (
    <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground'>
      <span className='inline-flex items-center gap-1.5'>
        <CalendarDays size={14} /> {format(new Date(post.date), 'd LLL yyyy')}
      </span>
      <span className='inline-flex items-center gap-1.5'>
        <Clock size={14} /> {post.readingMinutes} min read
      </span>
    </div>
  );
}

function PostList({ posts, onOpen }: { posts: Post[]; onOpen: (slug: string) => void }) {
  return (
    <div className='flex h-full flex-col bg-card'>
      <div className='flex items-center justify-between border-b px-5 py-3.5'>
        <div>
          <h1 className='text-lg font-bold leading-none'>Blog</h1>
          <p className='mt-1 text-xs text-muted-foreground'>
            {posts.length} post{posts.length === 1 ? '' : 's'} · writing about code, AI & tinkering
          </p>
        </div>
        <a
          href='/feed.xml'
          target='_blank'
          rel='noopener noreferrer'
          className='grid h-9 w-9 place-items-center rounded-lg border text-muted-foreground transition hover:text-primary'
          aria-label='RSS feed'
          title='RSS feed'
        >
          <Rss size={16} />
        </a>
      </div>
      <AppScroll className='flex-1 px-4 py-4'>
        {posts.length === 0 ? (
          <p className='px-1 py-8 text-center text-sm text-muted-foreground'>No posts yet — check back soon.</p>
        ) : (
          <ul className='space-y-3'>
            {posts.map((post) => (
              <li key={post.slug}>
                <button
                  type='button'
                  onClick={() => onOpen(post.slug)}
                  className='group w-full rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-[0_8px_22px_-10px_rgba(0,0,0,0.4)]'
                >
                  <h2 className='text-[16px] font-bold leading-snug transition-colors group-hover:text-primary'>{post.title}</h2>
                  <div className='mt-1.5'>
                    <PostMeta post={post} />
                  </div>
                  {post.excerpt ? (
                    <p className='mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-muted-foreground'>{post.excerpt}</p>
                  ) : null}
                  {post.tags.length > 0 ? (
                    <div className='mt-3 flex flex-wrap gap-1.5'>
                      {post.tags.map((t) => (
                        <Chip key={t}>#{t}</Chip>
                      ))}
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </AppScroll>
    </div>
  );
}

function PostReader({ post, onBack }: { post: Post; onBack: () => void }) {
  return (
    <div className='flex h-full flex-col bg-card'>
      <div className='flex shrink-0 items-center gap-2 border-b px-3 py-2'>
        <button
          type='button'
          onClick={onBack}
          className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground'
        >
          <ArrowLeft size={15} /> All posts
        </button>
        <span className='truncate text-[13px] font-medium text-muted-foreground'>{post.title}</span>
      </div>
      <AppScroll className='flex-1'>
        <article className='mx-auto max-w-2xl px-6 py-7'>
          {post.tags.length > 0 ? (
            <div className='mb-3 flex flex-wrap gap-1.5'>
              {post.tags.map((t) => (
                <Chip key={t} accent='var(--brand-purple)'>
                  #{t}
                </Chip>
              ))}
            </div>
          ) : null}
          <h1 className='text-[28px] font-bold leading-tight tracking-tight'>{post.title}</h1>
          <div className='mt-3 border-b pb-4'>
            <PostMeta post={post} />
          </div>
          <div className={cn('prose prose-eddie mt-5 max-w-none', 'prose-headings:font-bold prose-headings:tracking-tight')}>
            <MarkdownContent body={post.body} />
          </div>
        </article>
      </AppScroll>
    </div>
  );
}

export function BlogApp({ win }: AppContentProps) {
  const { posts } = useOSData();
  const updateProps = useWindowStore((s) => s.updateProps);
  const initial = typeof win.props?.slug === 'string' ? (win.props.slug as string) : null;
  const [activeSlug, setActiveSlug] = useState<string | null>(initial);

  // React to deep-links opened from other apps (projects / terminal / URL).
  useEffect(() => {
    if (typeof win.props?.slug === 'string') setActiveSlug(win.props.slug as string);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.props?.slug, win.nonce]);

  // Mirror the open post into the window props so the address bar can reflect /blog/<slug>.
  useEffect(() => {
    updateProps(win.id, { slug: activeSlug ?? undefined });
  }, [activeSlug, win.id, updateProps]);

  const active = activeSlug ? posts.find((p) => p.slug === activeSlug) : undefined;

  if (active) return <PostReader post={active} onBack={() => setActiveSlug(null)} />;
  return <PostList posts={posts} onOpen={setActiveSlug} />;
}
