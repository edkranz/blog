'use client';

import { profile, socials } from '@/lib/eddie';
import { Github, Linkedin, type LucideIcon, Mail, Send, Youtube } from 'lucide-react';
import { useState } from 'react';
import { AppScroll, Chunky } from '../ui';

const ICONS: Record<string, LucideIcon> = { github: Github, linkedin: Linkedin, youtube: Youtube, email: Mail };

export function ContactApp() {
  const [message, setMessage] = useState('');
  const mailto = `mailto:${profile.email}?subject=${encodeURIComponent('Hello from kranz.au')}&body=${encodeURIComponent(message)}`;

  return (
    <AppScroll className='bg-card'>
      <div className='px-6 py-7'>
        <h1 className='text-2xl font-bold tracking-tight'>Get in touch</h1>
        <p className='mt-1.5 text-[14px] leading-relaxed text-muted-foreground'>
          Got a project, a question, or just want to say hi? I&apos;d love to hear from you.
        </p>

        <a
          href={`mailto:${profile.email}`}
          className='mt-5 flex items-center gap-3 rounded-xl border bg-secondary/40 p-4 transition hover:border-primary/40'
        >
          <span className='grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary'>
            <Mail size={20} />
          </span>
          <div>
            <div className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Email</div>
            <div className='text-[15px] font-bold'>{profile.email}</div>
          </div>
        </a>

        {/* Mini composer */}
        <div className='mt-4 rounded-xl border p-4'>
          <label htmlFor='msg' className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            Quick message
          </label>
          <textarea
            id='msg'
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder='Type a note and I&apos;ll open it in your email app…'
            className='os-scroll mt-2 w-full resize-none rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-primary'
          />
          <div className='mt-2 flex justify-end'>
            <Chunky variant='primary' href={mailto}>
              <Send size={15} /> Compose email
            </Chunky>
          </div>
        </div>

        {/* Channels */}
        <div className='mt-6 space-y-2'>
          {socials
            .filter((s) => ICONS[s.id])
            .map((s) => {
              const Icon = ICONS[s.id];
              return (
                <a
                  key={s.id}
                  href={s.url}
                  target={s.id === 'email' ? undefined : '_blank'}
                  rel='noopener noreferrer'
                  className='flex items-center gap-3 rounded-xl border px-4 py-3 transition hover:bg-secondary/50'
                >
                  <Icon size={18} className='text-foreground/70' />
                  <span className='flex-1 text-sm font-semibold'>{s.label}</span>
                  <span className='text-[13px] text-muted-foreground'>{s.handle}</span>
                </a>
              );
            })}
        </div>

        <p className='mt-6 text-center text-xs text-muted-foreground'>
          Based in {profile.location} · usually replies within a day
        </p>
      </div>
    </AppScroll>
  );
}
