'use client';

import { socials } from '@/lib/eddie';
import { cn } from '@/lib/utils';
import { Github, Linkedin, type LucideIcon, Mail, Youtube } from 'lucide-react';
import Image from 'next/image';
import type * as React from 'react';

/** Scroll container used as the body of most apps. */
export function AppScroll({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('os-scroll h-full overflow-y-auto', className)}>{children}</div>;
}

export function Chip({ children, accent, className }: { children: React.ReactNode; accent?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground/80',
        className,
      )}
      style={accent ? { borderColor: accent, color: accent } : undefined}
    >
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className='mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground'>{children}</h3>;
}

type ChunkyProps = {
  children: React.ReactNode;
  variant?: 'primary' | 'default';
  href?: string;
  onClick?: () => void;
  className?: string;
  external?: boolean;
};

export function Chunky({ children, variant = 'default', href, onClick, className, external }: ChunkyProps) {
  const cls = cn(
    'btn-chunky inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold',
    variant === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground',
    className,
  );
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  }
  return (
    <button type='button' onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

const SOCIAL_ICON: Partial<Record<string, LucideIcon>> = {
  github: Github,
  linkedin: Linkedin,
  youtube: Youtube,
  email: Mail,
};

export function SocialRow({ ids, className }: { ids?: string[]; className?: string }) {
  const list = socials.filter((s) => SOCIAL_ICON[s.id] && (!ids || ids.includes(s.id)));
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {list.map((s) => {
        const Icon = SOCIAL_ICON[s.id]!;
        return (
          <a
            key={s.id}
            href={s.url}
            target={s.id === 'email' ? undefined : '_blank'}
            rel='noopener noreferrer'
            aria-label={s.label}
            title={`${s.label} · ${s.handle}`}
            className='group grid h-10 w-10 place-items-center rounded-xl border bg-card text-foreground/75 transition hover:text-white'
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = s.color;
              e.currentTarget.style.borderColor = s.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.borderColor = '';
            }}
          >
            <Icon className='h-4.5 w-4.5' size={18} />
          </a>
        );
      })}
    </div>
  );
}

export function Squircle({
  src,
  alt,
  size = 96,
  tilt = 0,
  className,
  priority,
}: {
  src: string;
  alt: string;
  size?: number;
  tilt?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn('shrink-0 overflow-hidden border-2 border-card bg-muted shadow-[0_6px_18px_rgba(0,0,0,0.22)]', className)}
      style={{ width: size, height: size, borderRadius: size * 0.28, transform: tilt ? `rotate(${tilt}deg)` : undefined }}
    >
      <Image src={src} alt={alt} width={size * 2} height={size * 2} priority={priority} className='h-full w-full object-cover' />
    </div>
  );
}
