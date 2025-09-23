'use client';
import * as React from 'react';
import Link from 'next/link';
import type { Template } from 'tinacms';
import { tinaField } from 'tinacms/dist/react';
import { Icon } from '@/components/icon';
import { iconSchema } from '@/tina/fields/icon';

type ProfileCardProps = {
  data: {
    name?: string;
    subtitle?: string;
    links?: { label?: string; href?: string }[];
    socials?: { icon?: { name?: string; color?: string; style?: string }; url?: string }[];
  };
};

export const ProfileCard: React.FC<ProfileCardProps> = ({ data }) => {
  const name = data.name || 'Eddie Kranz';
  const subtitle = data.subtitle || '';
  const links = data.links || [
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' },
  ];
  const socials = data.socials || [];

  return (
    <section className="min-h-[80vh] grid place-items-center">
      <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-900/10 dark:border-white/10 rounded-2xl shadow-sm px-8 py-10">
        <h1 className="text-3xl md:text-4xl font-semibold text-center tracking-tight" data-tina-field={tinaField(data as any, 'name')}>
          {name}
        </h1>
        {subtitle ? (
          <p className="text-muted-foreground mt-2 text-center" data-tina-field={tinaField(data as any, 'subtitle')}>
            {subtitle}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          {links?.map((l, i) => (
            <React.Fragment key={`${l?.label}-${i}`}>
              {i > 0 && <span aria-hidden className="text-muted-foreground/70">/</span>}
              <Link href={l?.href || '#'} className="text-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:no-underline" data-tina-field={tinaField(l as any)}>
                {l?.label}
              </Link>
            </React.Fragment>
          ))}
        </div>

        {socials && socials.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            {socials.map((s, i) => (
              <Link key={`${s?.icon?.name}-${i}`} href={s?.url || '#'} target="_blank" rel="noopener noreferrer" aria-label={s?.icon?.name || 'social link'} data-tina-field={tinaField(s as any)}>
                <Icon data={{ ...(s!.icon as any), size: 'small' }} className="text-foreground/70 hover:text-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export const profileCardBlockSchema: Template = {
  name: 'profileCard',
  label: 'Profile Card',
  ui: {
    previewSrc: '/blocks/content.png',
    defaultItem: {
      name: 'Eddie Kranz',
      subtitle: '',
      links: [
        { label: 'Blog', href: '/blog' },
        { label: 'About', href: '/about' },
      ],
    },
  },
  fields: [
    { type: 'string', name: 'name', label: 'Name' },
    { type: 'string', name: 'subtitle', label: 'Subtitle' },
    {
      type: 'object',
      name: 'links',
      label: 'Links',
      list: true,
      ui: { itemProps: (item) => ({ label: item?.label }) },
      fields: [
        { type: 'string', name: 'label', label: 'Label' },
        { type: 'string', name: 'href', label: 'Href' },
      ],
    },
    {
      type: 'object',
      name: 'socials',
      label: 'Social Icons',
      list: true,
      ui: { itemProps: (item) => ({ label: item?.icon?.name || 'icon' }) },
      fields: [
        iconSchema as any,
        { type: 'string', name: 'url', label: 'Url' },
      ],
    },
  ],
};


