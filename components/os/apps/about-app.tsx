'use client';

import { PROFILE_FILE } from '@/lib/admin/types';
import { useContent } from '@/lib/os/content';
import { cn } from '@/lib/utils';
import { GraduationCap, MapPin } from 'lucide-react';
import { AddItem, Editable } from '../editable';
import { InlineMarkdown } from '../inline-markdown';
import { AppScroll, Chip, SectionLabel, SocialRow, Squircle } from '../ui';

const F = PROFILE_FILE;

export function AboutApp() {
  const { site } = useContent();
  const { profile, about, technologies, skills, education, hobbies } = site;

  return (
    <AppScroll className='bg-card'>
      <div className='mx-auto max-w-2xl px-6 py-7'>
        {/* Identity header */}
        <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
          <Squircle src={profile.avatar} alt={profile.name} size={84} tilt={-3} />
          <div>
            <Editable file={F} path='profile.name' value={profile.name} as='h1' className='text-2xl font-bold tracking-tight' />
            <p className='text-[15px] font-semibold text-primary'>
              <Editable file={F} path='profile.role' value={profile.role} /> · <Editable file={F} path='profile.company.name' value={profile.company.name} />
            </p>
            <p className='mt-1 flex items-center gap-1.5 text-sm text-muted-foreground'>
              <MapPin size={14} /> <Editable file={F} path='profile.location' value={profile.location} />
            </p>
          </div>
        </div>

        {about.bio.map((para, i) => (
          <Editable
            key={i}
            file={F}
            path={`about.bio.${i}`}
            value={para}
            as='p'
            multiline
            className={cn('text-[15px] leading-relaxed text-foreground/85', i === 0 ? 'mt-6' : 'mt-3')}
          >
            <InlineMarkdown text={para} />
          </Editable>
        ))}

        {/* Technologies */}
        <section className='mt-8'>
          <SectionLabel>Technologies</SectionLabel>
          <div className='flex flex-wrap items-center gap-2'>
            {technologies.map((t, i) => (
              <Chip key={i}>
                <Editable file={F} path={`technologies.${i}`} value={t} removable />
              </Chip>
            ))}
            <AddItem file={F} path='technologies' value='untitled' label='Add technology' />
          </div>
        </section>

        {/* Skills */}
        <section className='mt-8'>
          <SectionLabel>Key skills &amp; achievements</SectionLabel>
          <div className='grid gap-3 sm:grid-cols-2'>
            {skills.map((s, i) => (
              <div key={i} className='rounded-xl border bg-secondary/40 p-4'>
                <div className='mb-1.5 h-1.5 w-9 rounded-full' style={{ background: s.accent }} />
                <Editable file={F} path={`skills.${i}.title`} value={s.title} as='h4' className='text-sm font-bold' />
                <Editable file={F} path={`skills.${i}.body`} value={s.body} as='p' multiline className='mt-1 text-[13px] leading-relaxed text-muted-foreground' />
              </div>
            ))}
          </div>
        </section>

        {/* Education */}
        <section className='mt-8'>
          <SectionLabel>Education &amp; development</SectionLabel>
          <ul className='space-y-2'>
            {education.map((e, i) => (
              <li key={i} className='flex gap-2.5 text-[14px] text-foreground/85'>
                <GraduationCap size={17} className='mt-0.5 shrink-0 text-primary' />
                <Editable file={F} path={`education.${i}`} value={e} removable />
              </li>
            ))}
          </ul>
          <div className='mt-2'>
            <AddItem file={F} path='education' value='untitled' label='Add education' />
          </div>
        </section>

        {/* Hobbies */}
        <section className='mt-8'>
          <SectionLabel>Away from the keyboard</SectionLabel>
          <div className='flex flex-wrap items-center gap-2'>
            {hobbies.map((h, i) => (
              <span key={i} className='rounded-full border bg-secondary/40 px-3 py-1 text-[13px]'>
                <Editable file={F} path={`hobbies.${i}`} value={h} removable />
              </span>
            ))}
            <AddItem file={F} path='hobbies' value='untitled' label='Add hobby' />
          </div>
        </section>

        <section className='mt-8 border-t pt-6'>
          <SectionLabel>Find me online</SectionLabel>
          <SocialRow />
        </section>
      </div>
    </AppScroll>
  );
}
