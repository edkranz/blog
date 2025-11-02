'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { TinaMarkdown } from 'tinacms/dist/rich-text';
import { PostConnectionQuery, PostConnectionQueryVariables } from '@/tina/__generated__/types';
import ErrorBoundary from '@/components/error-boundary';
import { ArrowRight, Rss } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/layout/section';
import { FloatingBackdrop } from '@/components/layout/floating-backdrop';
import { GlassCard } from '@/components/ui/glass-card';
import { motion } from 'motion/react';

interface ClientPostProps {
  data: PostConnectionQuery;
  variables: PostConnectionQueryVariables;
  query: string;
}

export default function PostsClientPage(props: ClientPostProps) {
  const posts = props.data?.postConnection.edges!
    .filter((postData) => {
      const post = postData!.node!;
      return !post.hideFromBlogList;
    })
    .map((postData) => {
    const post = postData!.node!;
    const date = new Date(post.date!);
    let formattedDate = '';
    if (!isNaN(date.getTime())) {
      formattedDate = format(date, 'MMM dd, yyyy');
    }

    return {
      id: post.id,
      published: formattedDate,
      title: post.title,
      tags: post.tags?.map((tag) => tag?.tag?.name) || [],
      url: `/posts/${post._sys.breadcrumbs.join('/')}`,
      excerpt: post.excerpt,
      heroImg: post.heroImg,
      author: {
        name: post.author?.name || 'Anonymous',
        avatar: post.author?.avatar,
      }
    }
  });

  return (
    <ErrorBoundary>
      <Section className="px-4 pt-4 pb-8 sm:pb-12">
        <FloatingBackdrop>
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
            {posts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
                className="w-full max-w-sm"
              >
                <Link href={post.url} className="block group">
                  <GlassCard className="h-full p-5 sm:p-6 transition-all duration-300 hover:shadow-[0_20px_50px_-12px_rgba(255,255,255,0.25)] dark:hover:shadow-[0_20px_50px_-12px_rgba(255,255,255,0.15)] hover:-translate-y-2 hover:scale-[1.02] cursor-pointer">
                    <div className="flex flex-col gap-4 h-full">
                      {post.heroImg && (
                        <div className="aspect-square overflow-clip rounded-2xl ring-1 ring-white/30 dark:ring-white/10 shadow-md">
                          <Image
                            width={400}
                            height={400}
                            src={post.heroImg}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider font-medium text-foreground/70 dark:text-foreground/80">
                        {post.tags?.map((tag) => <span key={tag}>{tag}</span>)}
                      </div>
                      <h3 className="text-lg font-semibold sm:text-xl text-foreground dark:text-foreground group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <div className="text-foreground/85 dark:text-foreground/90 text-sm leading-relaxed flex-1">
                        <TinaMarkdown content={post.excerpt} />
                      </div>
                      <div className="mt-auto pt-2 flex items-center gap-3 text-sm">
                        <span className="font-medium text-foreground/80 dark:text-foreground/90">{post.author.name}</span>
                        <span className="text-foreground/40 dark:text-foreground/50">•</span>
                        <span className="text-foreground/80 dark:text-foreground/90">{post.published}</span>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
        </FloatingBackdrop>
      </Section>
    </ErrorBoundary>
  );
}
