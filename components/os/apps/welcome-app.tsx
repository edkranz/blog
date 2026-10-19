'use client';

import { PROFILE_FILE } from '@/lib/admin/types';
import { useContent } from '@/lib/os/content';
import { useWindowStore } from '@/lib/os/store';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Editable } from '../editable';
import { AppScroll, Chunky, SocialRow, Squircle } from '../ui';

export function WelcomeApp() {
  const openApp = useWindowStore((s) => s.openApp);
  const {
    site: { profile },
  } = useContent();
  const [spin, setSpin] = useState(0);

  return (
    <AppScroll className='bg-card'>
      {/* Warm hero band */}
      <div className='relative h-24 overflow-hidden wp-sunrise grain'>
        <div className='dot-grid absolute inset-0 opacity-40' />
      </div>

      <div className='px-6 pb-7'>
        <button
          type='button'
          aria-label='Spin photo'
          onClick={() => setSpin((s) => s + 1)}
          className='-mt-12 mb-3 block rounded-[26px] ring-4 ring-card transition-transform'
          style={{ transform: `rotate(${spin * 360 - 4}deg)`, transitionDuration: '700ms' }}
        >
          <Squircle src={profile.avatar} alt={profile.name} size={92} priority />
        </button>

        <h1 className='text-[28px] font-bold leading-tight tracking-tight'>
          <Editable file={PROFILE_FILE} path='profile.intro' value={profile.intro} /> <span className='os-wave'>👋</span>
        </h1>
        <p className='mt-1 text-[15px] font-semibold text-muted-foreground'>
          <Editable file={PROFILE_FILE} path='profile.role' value={profile.role} /> at{' '}
          <a href={profile.company.url} target='_blank' rel='noopener noreferrer' className='text-primary underline-offset-2 hover:underline'>
            <Editable file={PROFILE_FILE} path='profile.company.name' value={profile.company.name} />
          </a>
        </p>

        <Editable file={PROFILE_FILE} path='profile.blurb' value={profile.blurb} as='p' multiline className='mt-3 text-[15px] leading-relaxed text-foreground/85' />

        <div className='mt-5 flex flex-wrap gap-2.5'>
          <Chunky variant='primary' onClick={() => openApp('about')}>
            About me <ArrowRight size={16} />
          </Chunky>
          <Chunky onClick={() => openApp('blog')}>Read the blog</Chunky>
          <Chunky onClick={() => openApp('projects')}>See my work</Chunky>
        </div>

        <div className='mt-6'>
          <SocialRow ids={['github', 'linkedin', 'youtube', 'email']} />
        </div>
      </div>
    </AppScroll>
  );
}
