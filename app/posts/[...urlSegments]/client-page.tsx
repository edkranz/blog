'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { tinaField, useTina } from 'tinacms/dist/react';
import { TinaMarkdown } from 'tinacms/dist/rich-text';
import { PostQuery } from '@/tina/__generated__/types';
import { Section } from '@/components/layout/section';
import { FloatingBackdrop } from '@/components/layout/floating-backdrop';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { components } from '@/components/mdx-components';
import ErrorBoundary from '@/components/error-boundary';


interface ClientPostProps {
  data: PostQuery;
  variables: {
    relativePath: string;
  };
  query: string;
}

export default function PostClientPage(props: ClientPostProps) {
  const { data } = useTina({ ...props });
  const post = data.post;

  const date = new Date(post.date!);
  let formattedDate = '';
  if (!isNaN(date.getTime())) {
    formattedDate = format(date, 'MMM dd, yyyy');
  }

  return (
    <ErrorBoundary>
      <Section className='px-4'>
        <FloatingBackdrop>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
        <GlassCard className='max-w-3xl mx-auto p-6 sm:p-8'>
          <div className='mb-6 flex items-center justify-between'>
            <Link href='/posts'>
              <Button variant='ghost' className='-ml-2 text-foreground/80 hover:text-white hover:bg-black dark:hover:bg-white dark:hover:text-black transition-colors'>
                <ArrowLeft className='size-4' />
                Back
              </Button>
            </Link>
            <p
              data-tina-field={tinaField(post, 'date')}
              className='text-base font-medium text-foreground/70 dark:text-foreground/80'
            >
              {formattedDate}
            </p>
          </div>
        <h2 data-tina-field={tinaField(post, 'title')} className="w-full relative mb-8 text-4xl sm:text-5xl font-playfair font-bold tracking-tight text-center text-foreground dark:text-foreground leading-tight">
          {post.title}
        </h2>
        {post.heroImg && (
          <div className='px-4 w-full'>
            <div data-tina-field={tinaField(post, 'heroImg')} className='relative max-w-4xl lg:max-w-5xl mx-auto'>
              <Image
                priority={true}
                src={post.heroImg}
                alt={post.title}
                className='absolute block mx-auto rounded-lg w-full h-auto blur-2xl opacity-20 dark:opacity-10 grayscale'
                aria-hidden='true'
                width={500}
                height={500}
                style={{ maxHeight: '25vh' }}
              />
              <Image
                priority={true}
                src={post.heroImg}
                alt={post.title}
                width={500}
                height={500}
                className='relative z-10 mb-14 mx-auto block rounded-lg w-full h-auto opacity-100 grayscale-[0.3]'
                style={{ maxWidth: '25vh' }}
              />
            </div>
          </div>
        )}
        <div data-tina-field={tinaField(post, '_body')} className='prose prose-lg dark:prose-invert font-playfair prose-headings:font-playfair prose-headings:text-foreground prose-headings:font-semibold prose-h1:text-foreground prose-h2:text-foreground prose-h3:text-foreground prose-p:text-foreground dark:prose-p:text-foreground prose-strong:text-foreground dark:prose-strong:text-foreground prose-strong:font-semibold prose-a:text-foreground prose-a:underline prose-a:decoration-foreground/40 hover:prose-a:decoration-foreground/60 prose-code:text-foreground prose-code:bg-foreground/5 dark:prose-code:bg-foreground/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-foreground/5 dark:prose-pre:bg-foreground/10 prose-pre:border prose-pre:border-foreground/10 dark:prose-pre:border-foreground/20 prose-blockquote:border-l-foreground/30 dark:prose-blockquote:border-l-foreground/40 prose-blockquote:text-foreground dark:prose-blockquote:text-foreground prose-blockquote:bg-foreground/5 dark:prose-blockquote:bg-foreground/10 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:my-4 prose-li:text-foreground dark:prose-li:text-foreground prose-ul:text-foreground dark:prose-ul:text-foreground prose-ol:text-foreground dark:prose-ol:text-foreground w-full max-w-none'>
          <TinaMarkdown
            content={post._body}
            components={{
              ...components,
            }}
          />
        </div>
        {post.author && (
          <div className='mt-12 pt-8 border-t border-foreground/10 dark:border-foreground/20'>
            <h3 className='text-xl font-playfair font-semibold mb-4 text-foreground dark:text-foreground'>About the author</h3>
            <div className='flex items-start gap-4'>
              {post.author.avatar && (
                <Image
                  priority={false}
                  className='h-16 w-16 object-cover rounded-full shadow-md ring-2 ring-white/20 dark:ring-white/10'
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={256}
                  height={256}
                />
              )}
              <div>
                <p className='font-semibold text-foreground dark:text-foreground'>{post.author.name}</p>
                <p className='text-sm text-foreground/80 dark:text-foreground/80 mt-1'>
                  Eddie Kranz is a developer at SSW. Learn more on his
                  {' '}<a href='https://ssw.com.au/people/eddie-kranz' target='_blank' rel='noopener noreferrer' className='underline text-primary hover:text-primary/80'>SSW profile</a>.
                </p>
              </div>
            </div>
          </div>
        )}
        </GlassCard>
        </motion.div>
        </FloatingBackdrop>
      </Section>
    </ErrorBoundary>
  );
}
