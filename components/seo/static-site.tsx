import { education, hobbies, profile, projects, skills, socials, technologies } from '@/lib/eddie';
import type { Post } from '@/lib/posts';
import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { StaticMarkdown } from './static-markdown';

// Server-rendered, crawlable HTML for every route. The dynamic OS overlays this
// when JS runs (see the os-root / noscript gating); curl & crawlers get this.

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/projects', label: 'Projects' },
  { href: '/contact', label: 'Contact' },
];

const fmt = (d: string) => format(new Date(d), 'd LLL yyyy');

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className='seo-layer relative z-0 min-h-screen bg-background text-foreground'>
      <header className='mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-6 py-5'>
        <a href='/' className='font-bold'>
          {profile.name}
        </a>
        <nav className='flex flex-wrap gap-4 text-sm'>
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className='text-muted-foreground hover:text-foreground'>
              {n.label}
            </a>
          ))}
        </nav>
      </header>
      <main className='mx-auto max-w-2xl px-6 py-6'>{children}</main>
      <footer className='mx-auto mt-8 max-w-2xl px-6 py-10 text-sm text-muted-foreground'>
        <p>
          {profile.name} — {profile.role} at {profile.company.name}. {profile.location}.
        </p>
        <p className='mt-2 flex flex-wrap gap-3'>
          {socials.map((s) => (
            <a key={s.id} href={s.url} className='hover:text-foreground'>
              {s.label}
            </a>
          ))}
          <a href='/feed.xml' className='hover:text-foreground'>
            RSS
          </a>
        </p>
      </footer>
    </div>
  );
}

export function StaticSite({ segments, posts }: { segments?: string[]; posts: Post[] }) {
  const [first, second] = segments ?? [];

  // /blog/<slug> — the full post
  if (first === 'blog' && second) {
    const post = posts.find((p) => p.slug === second);
    if (post) {
      return (
        <Shell>
          <article className='prose prose-eddie max-w-none'>
            <p className='not-prose mb-4'>
              <a href='/blog'>← All posts</a>
            </p>
            <h1>{post.title}</h1>
            <p className='not-prose text-sm text-muted-foreground'>
              {fmt(post.date)} · {post.readingMinutes} min read
            </p>
            <StaticMarkdown body={post.body} />
          </article>
        </Shell>
      );
    }
  }

  // /blog — the index
  if (first === 'blog') {
    return (
      <Shell>
        <h1 className='text-2xl font-bold'>Blog</h1>
        <ul className='mt-5 space-y-6'>
          {posts.map((p) => (
            <li key={p.slug}>
              <h2 className='text-lg font-semibold'>
                <a href={`/blog/${p.slug}`}>{p.title}</a>
              </h2>
              <p className='text-sm text-muted-foreground'>
                {fmt(p.date)} · {p.readingMinutes} min read
              </p>
              {p.excerpt ? <p className='mt-1 text-muted-foreground'>{p.excerpt}</p> : null}
            </li>
          ))}
        </ul>
      </Shell>
    );
  }

  // /about
  if (first === 'about') {
    return (
      <Shell>
        <h1 className='text-2xl font-bold'>About {profile.name}</h1>
        <p className='mt-1 text-muted-foreground'>
          {profile.role} at {profile.company.name} · {profile.location}
        </p>
        <p className='mt-4'>{profile.blurb}</p>
        <h2 className='mt-8 text-xl font-bold'>Skills</h2>
        <ul className='mt-2 space-y-2'>
          {skills.map((s) => (
            <li key={s.title}>
              <strong>{s.title}</strong> — {s.body}
            </li>
          ))}
        </ul>
        <h2 className='mt-8 text-xl font-bold'>Technologies</h2>
        <p className='mt-2 text-muted-foreground'>{technologies.join(' · ')}</p>
        <h2 className='mt-8 text-xl font-bold'>Education</h2>
        <ul className='mt-2 list-disc space-y-1 pl-5'>
          {education.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <h2 className='mt-8 text-xl font-bold'>Beyond the keyboard</h2>
        <ul className='mt-2 list-disc space-y-1 pl-5'>
          {hobbies.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </Shell>
    );
  }

  // /projects
  if (first === 'projects') {
    return (
      <Shell>
        <h1 className='text-2xl font-bold'>Projects</h1>
        <div className='mt-5 space-y-8'>
          {projects.map((p) => (
            <section key={p.id}>
              <h2 className='text-lg font-semibold'>{p.title}</h2>
              <p className='text-sm text-muted-foreground'>
                {p.subtitle} · {p.year}
              </p>
              <p className='mt-1'>{p.description}</p>
              <p className='mt-1 text-sm text-muted-foreground'>{p.tech.join(' · ')}</p>
              {p.link?.kind === 'url' ? (
                <p className='mt-1'>
                  <a href={p.link.href}>{p.link.label}</a>
                </p>
              ) : null}
              {p.link?.kind === 'post' ? (
                <p className='mt-1'>
                  <a href={`/blog/${p.link.slug}`}>{p.link.label}</a>
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </Shell>
    );
  }

  // /contact
  if (first === 'contact') {
    return (
      <Shell>
        <h1 className='text-2xl font-bold'>Contact</h1>
        <p className='mt-2'>
          Get in touch with {profile.name} — <a href={`mailto:${profile.email}`}>{profile.email}</a>.
        </p>
        <ul className='mt-4 space-y-2'>
          {socials.map((s) => (
            <li key={s.id}>
              <a href={s.url}>{s.label}</a> — {s.handle}
            </li>
          ))}
        </ul>
      </Shell>
    );
  }

  // Home (and any tool/game route falls back to this overview)
  return (
    <Shell>
      <h1 className='text-3xl font-bold'>{profile.name}</h1>
      <p className='mt-1 text-muted-foreground'>
        {profile.role} at <a href={profile.company.url}>{profile.company.name}</a> · {profile.location}
      </p>
      <p className='mt-4'>{profile.blurb}</p>
      <p className='mt-4 flex flex-wrap gap-3'>
        <a href='/about'>About</a>
        <a href='/blog'>Blog</a>
        <a href='/projects'>Projects</a>
        <a href='/contact'>Contact</a>
      </p>
      {posts.length > 0 ? (
        <>
          <h2 className='mt-8 text-xl font-bold'>Latest posts</h2>
          <ul className='mt-2 space-y-3'>
            {posts.slice(0, 5).map((p) => (
              <li key={p.slug}>
                <a href={`/blog/${p.slug}`}>{p.title}</a>
                {p.excerpt ? <span className='text-muted-foreground'> — {p.excerpt}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Shell>
  );
}
