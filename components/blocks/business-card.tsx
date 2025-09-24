'use client';
import * as React from 'react';
import type { Template } from 'tinacms';
import { tinaField } from 'tinacms/dist/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Github, Linkedin } from 'lucide-react';

type BusinessCardProps = {
  data: {
    initials?: string;
    name?: string;
    title?: string;
    phone?: string;
    email?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    tagline?: string;
    photo?: string;
  };
};

export const BusinessCard: React.FC<BusinessCardProps> = ({ data }) => {
  const initials = data.initials || 'EK';
  const name = data.name || 'Eddie Kranz';
  const title = data.title || 'Software Engineer';
  const phone = data.phone || '';
  const email = data.email || '';
  const githubUrl = data.githubUrl || '';
  const linkedinUrl = data.linkedinUrl || '';
  const tagline = data.tagline || 'Building digital experiences with precision';
  const photo = data.photo;

  return (
    <section className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl p-8 bg-white/35 dark:bg-slate-900/30 backdrop-blur-xl ring-1 ring-white/20 shadow-xl">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-cyan-200 to-blue-300 dark:from-cyan-800 dark:to-blue-900 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-8 left-8 w-24 h-24 bg-gradient-to-br from-teal-200 to-cyan-300 dark:from-teal-800 dark:to-cyan-900 rounded-full blur-2xl animate-pulse [animation-delay:1000ms]" />
        </div>

        <div className="relative z-10 text-left">
          <div className="mb-6">
            {photo ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 ring-1 ring-white/30 shadow-lg">
                <Image src={photo} alt={name} width={160} height={160} className="w-20 h-20 object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-600 dark:to-blue-700 mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                <span data-tina-field={tinaField(data as any, 'initials')}>{initials}</span>
              </div>
            )}

            <h1
              className="text-3xl font-bold text-foreground mb-2 text-balance"
              data-tina-field={tinaField(data as any, 'name')}
            >
              {name}
            </h1>

            <p className="text-lg text-muted-foreground font-medium" data-tina-field={tinaField(data as any, 'title')}>
              {title}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {phone && (
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium text-foreground bg-white/30 dark:bg-slate-900/30 backdrop-blur-lg ring-1 ring-white/25 hover:text-primary transition-colors group w-full"
                data-tina-field={tinaField(data as any, 'phone')}
              >
                <Phone className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                {phone}
              </a>
            )}

            {email && (
              <a
                href={`mailto:${email}`}
                className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium text-foreground bg-white/30 dark:bg-slate-900/30 backdrop-blur-lg ring-1 ring-white/25 hover:text-primary transition-colors group w-full"
                data-tina-field={tinaField(data as any, 'email')}
              >
                <Mail className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                {email}
              </a>
            )}
          </div>

          <div className="flex gap-3">
            {githubUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl w-12 h-12 bg-white/30 dark:bg-slate-900/30 backdrop-blur-lg ring-1 ring-white/25 hover:text-primary"
                asChild
                data-tina-field={tinaField(data as any, 'githubUrl')}
              >
                <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                  <Github className="w-5 h-5" />
                  <span className="sr-only">GitHub</span>
                </a>
              </Button>
            )}

            {linkedinUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl w-12 h-12 bg-white/30 dark:bg-slate-900/30 backdrop-blur-lg ring-1 ring-white/25 hover:text-primary"
                asChild
                data-tina-field={tinaField(data as any, 'linkedinUrl')}
              >
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-5 h-5" />
                  <span className="sr-only">LinkedIn</span>
                </a>
              </Button>
            )}
          </div>

          {tagline && (
            <div className="mt-6 pt-4 border-t border-white/20 dark:border-white/10">
              <p className="text-xs text-muted-foreground" data-tina-field={tinaField(data as any, 'tagline')}>{tagline}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export const businessCardBlockSchema: Template = {
  name: 'businessCard',
  label: 'Business Card',
  ui: {
    previewSrc: '/blocks/content.png',
    defaultItem: {
      initials: 'EK',
      name: 'Eddie Kranz',
      title: 'Software Engineer',
      phone: '0432 269 313',
      email: 'ed@kranz.au',
      githubUrl: 'https://github.com/edkranz',
      linkedinUrl: 'https://www.linkedin.com/in/kranz',
      tagline: 'Building digital experiences with precision',
      photo: '/uploads/authors/eddie.jpg',
    },
  },
  fields: [
    { type: 'string', name: 'initials', label: 'Initials' },
    { type: 'string', name: 'name', label: 'Name' },
    { type: 'string', name: 'title', label: 'Title' },
    { type: 'string', name: 'phone', label: 'Phone' },
    { type: 'string', name: 'email', label: 'Email' },
    { type: 'string', name: 'githubUrl', label: 'GitHub URL' },
    { type: 'string', name: 'linkedinUrl', label: 'LinkedIn URL' },
    { type: 'string', name: 'tagline', label: 'Tagline' },
    { type: 'image', name: 'photo', label: 'Photo (optional)' },
  ],
};


