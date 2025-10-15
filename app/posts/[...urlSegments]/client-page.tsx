'use client';
import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { tinaField, useTina } from 'tinacms/dist/react';
import { TinaMarkdown } from 'tinacms/dist/rich-text';
import { PostQuery } from '@/tina/__generated__/types';
import { useLayout } from '@/components/layout/layout-context';
import { Section } from '@/components/layout/section';
import { FloatingBackdrop } from '@/components/layout/floating-backdrop';
import { GlassCard } from '@/components/ui/glass-card';
import { motion } from 'motion/react';
import { components } from '@/components/mdx-components';
import ErrorBoundary from '@/components/error-boundary';

const titleColorClasses = {
  blue: 'from-blue-400 to-blue-600 dark:from-blue-300 dark:to-blue-500',
  teal: 'from-teal-400 to-teal-600 dark:from-teal-300 dark:to-teal-500',
  green: 'from-green-400 to-green-600',
  red: 'from-red-400 to-red-600',
  pink: 'from-pink-300 to-pink-500',
  purple: 'from-purple-400 to-purple-600 dark:from-purple-300 dark:to-purple-500',
  orange: 'from-orange-300 to-orange-600 dark:from-orange-200 dark:to-orange-500',
  yellow: 'from-yellow-400 to-yellow-500 dark:from-yellow-300 dark:to-yellow-500',
};

interface ClientPostProps {
  data: PostQuery;
  variables: {
    relativePath: string;
  };
  query: string;
}

export default function PostClientPage(props: ClientPostProps) {
  const { theme } = useLayout();
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
        <GlassCard className='max-w-3xl mx-auto p-6 sm:p-8 ring-white/25 bg-white/40 dark:bg-slate-900/35'>
        <h2 data-tina-field={tinaField(post, 'title')} className={`w-full relative\tmb-8 text-6xl font-extrabold tracking-normal text-center title-font`}>
          <span className={`bg-clip-text text-transparent bg-linear-to-r ${titleColorClasses[theme!.color!]}`}>{post.title}</span>
        </h2>
        <div data-tina-field={tinaField(post, 'author')} className='flex items-center justify-center mb-16'>
          {post.author && (
            <>
              {post.author.avatar && (
                <div className='shrink-0 mr-4'>
                  <Image
                    data-tina-field={tinaField(post.author, 'avatar')}
                    priority={true}
                    className='h-14 w-14 object-cover rounded-full shadow-xs'
                    src={post.author.avatar}
                    alt={post.author.name}
                    width={500}
                    height={500}
                  />
                </div>
              )}
              <p
                data-tina-field={tinaField(post.author, 'name')}
                className='text-base font-medium text-gray-600 group-hover:text-gray-800 dark:text-gray-200 dark:group-hover:text-white'
              >
                {post.author.name}
              </p>
              <span className='font-bold text-gray-200 dark:text-gray-500 mx-2'>—</span>
            </>
          )}
          <p
            data-tina-field={tinaField(post, 'date')}
            className='text-base text-gray-400 group-hover:text-gray-500 dark:text-gray-300 dark:group-hover:text-gray-150'
          >
            {formattedDate}
          </p>
        </div>
        {post.heroImg && (
          <div className='px-4 w-full'>
            <div data-tina-field={tinaField(post, 'heroImg')} className='relative max-w-4xl lg:max-w-5xl mx-auto'>
              <Image
                priority={true}
                src={post.heroImg}
                alt={post.title}
                width={1200}
                height={630}
                className='relative z-10 mb-10 mx-auto block rounded-2xl w-full h-auto'
              />
            </div>
          </div>
        )}
        <div data-tina-field={tinaField(post, '_body')} className='prose w-full max-w-none'>
          <TinaMarkdown
            content={post._body}
            components={{
              ...components,
            }}
          />
        </div>
        {post.author && (
          <div className='mt-12 pt-8 border-t border-border'>
            <h3 className='text-xl font-semibold mb-4'>About the author</h3>
            <div className='flex items-start gap-4'>
              {post.author.avatar && (
                <Image
                  priority={false}
                  className='h-16 w-16 object-cover rounded-full shadow-xs'
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={256}
                  height={256}
                />
              )}
              <div>
                <p className='font-medium'>{post.author.name}</p>
                <p className='text-sm text-gray-700 dark:text-gray-300 mt-1'>
                  Eddie Kranz is a developer at SSW. Learn more on his
                  {' '}<a href='https://ssw.com.au/people/eddie-kranz' target='_blank' rel='noopener noreferrer' className='underline'>SSW profile</a>.
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
