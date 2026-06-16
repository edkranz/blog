'use client';

import { education, hobbies, profile, skills, technologies } from '@/lib/eddie';
import { GraduationCap, MapPin } from 'lucide-react';
import { AppScroll, Chip, SectionLabel, SocialRow, Squircle } from '../ui';

export function AboutApp() {
  return (
    <AppScroll className='bg-card'>
      <div className='mx-auto max-w-2xl px-6 py-7'>
        {/* Identity header */}
        <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
          <Squircle src={profile.avatar} alt={profile.name} size={84} tilt={-3} />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{profile.name}</h1>
            <p className='text-[15px] font-semibold text-primary'>
              {profile.role} · {profile.company.name}
            </p>
            <p className='mt-1 flex items-center gap-1.5 text-sm text-muted-foreground'>
              <MapPin size={14} /> {profile.location}
            </p>
          </div>
        </div>

        <p className='mt-6 text-[15px] leading-relaxed text-foreground/85'>
          Eddie is a Software Developer with a keen eye for detail and a passion for creating high-quality, efficient
          solutions. He holds a Bachelor of Advanced Computing (Software Development) from the University of Sydney, where
          he wrote his thesis on <em>“Portal Redirection in Virtual Reality using Impossible Spaces”</em>.
        </p>
        <p className='mt-3 text-[15px] leading-relaxed text-foreground/85'>
          At SSW he works on projects that use AI to supercharge existing applications, and headless CMS to streamline
          content management. His focus is on delivering solutions that precisely meet client requirements.
        </p>

        {/* Technologies */}
        <section className='mt-8'>
          <SectionLabel>Technologies</SectionLabel>
          <div className='flex flex-wrap gap-2'>
            {technologies.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className='mt-8'>
          <SectionLabel>Key skills &amp; achievements</SectionLabel>
          <div className='grid gap-3 sm:grid-cols-2'>
            {skills.map((s) => (
              <div key={s.title} className='rounded-xl border bg-secondary/40 p-4'>
                <div className='mb-1.5 h-1.5 w-9 rounded-full' style={{ background: s.accent }} />
                <h4 className='text-sm font-bold'>{s.title}</h4>
                <p className='mt-1 text-[13px] leading-relaxed text-muted-foreground'>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Education */}
        <section className='mt-8'>
          <SectionLabel>Education &amp; development</SectionLabel>
          <ul className='space-y-2'>
            {education.map((e) => (
              <li key={e} className='flex gap-2.5 text-[14px] text-foreground/85'>
                <GraduationCap size={17} className='mt-0.5 shrink-0 text-primary' />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Hobbies */}
        <section className='mt-8'>
          <SectionLabel>Away from the keyboard</SectionLabel>
          <div className='flex flex-wrap gap-2'>
            {hobbies.map((h) => (
              <span key={h} className='rounded-full border bg-secondary/40 px-3 py-1 text-[13px]'>
                {h}
              </span>
            ))}
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
