'use client';
import * as React from 'react';
import Link from 'next/link';
import type { Template } from 'tinacms';
import { tinaField } from 'tinacms/dist/react';
import { Icon } from '@/components/icon';
import { iconSchema } from '@/tina/fields/icon';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

type ProfileCardProps = {
  data: {
    name?: string;
    subtitle?: string;
    photo?: string;
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
  const photo = data.photo || '/uploads/authors/eddie.jpg';

  return (
    <section className="min-h-[80vh] grid place-items-center">
      <div className="bg-white/45 dark:bg-zinc-900/30 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10 rounded-2xl shadow-lg px-8 py-10">
        <div className="mx-auto mb-6 size-28 overflow-hidden rounded-2xl ring-1 ring-black/10 dark:ring-white/10">
          <Image src={photo} alt={name} width={224} height={224} className="size-28 object-cover" />
        </div>
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center justify-center rounded-2xl bg-white/30 dark:bg-zinc-900/30 px-5 py-2 backdrop-blur-xl ring-1 ring-white/25 dark:ring-white/10 shadow-sm shadow-black/10">
            <h1
              className="text-center text-4xl md:text-5xl font-light tracking-tight text-black/85 dark:text-white/85 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]"
              style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 300 }}
              data-tina-field={tinaField(data as any, 'name')}
            >
              {name}
            </h1>
          </span>
        </div>
        {subtitle ? (
          <p className="text-muted-foreground mt-2 text-center" data-tina-field={tinaField(data as any, 'subtitle')}>
            {subtitle}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          {links?.map((l, i) => (
            <Button
              key={`${l?.label}-${i}`}
              asChild
              size="lg"
              variant="outline"
              className="rounded-xl bg-white/35 dark:bg-zinc-900/30 text-black/85 dark:text-white/85 backdrop-blur-xl ring-1 ring-white/25 dark:ring-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]"
              data-tina-field={tinaField(l as any)}
            >
              <Link href={l?.href || '#'}>{l?.label}</Link>
            </Button>
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
      photo: '/uploads/authors/eddie.jpg',
      links: [
        { label: 'Blog', href: '/blog' },
        { label: 'About', href: '/about' },
      ],
    },
  },
  fields: [
    { type: 'string', name: 'name', label: 'Name' },
    { type: 'string', name: 'subtitle', label: 'Subtitle' },
    { type: 'image', name: 'photo', label: 'Photo' },
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


