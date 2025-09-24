'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { TinaMarkdown } from 'tinacms/dist/rich-text';
import { PostConnectionQuery, PostConnectionQueryVariables } from '@/tina/__generated__/types';
import ErrorBoundary from '@/components/error-boundary';
import { ArrowRight, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/layout/section';
import { FloatingBackdrop } from '@/components/layout/floating-backdrop';
import { GlassCard } from '@/components/ui/glass-card';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ClientPostProps {
  data: PostConnectionQuery;
  variables: PostConnectionQueryVariables;
  query: string;
}

export default function PostsClientPage(props: ClientPostProps) {
  const posts = props.data?.postConnection.edges!.map((postData) => {
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
      <Section className="px-4">
        <FloatingBackdrop>
        <div className="container flex flex-col items-center gap-10 sm:gap-14">
          <div className="text-center">
            <h2 className="mx-auto mb-6 text-pretty text-3xl font-semibold md:text-4xl lg:max-w-3xl">
              Blog Posts
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground md:text-lg">
              Discover the latest insights and tutorials about modern web development, UI design, and component-driven architecture.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {posts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
              >
                <GlassCard className="p-4 sm:p-5 ring-white/25 bg-white/40 dark:bg-slate-900/35">
                  <div className="flex flex-col gap-4">
                    {post.heroImg && (
                      <Link href={post.url} className="block group">
                        <div className="aspect-[16/9] overflow-clip rounded-2xl ring-1 ring-white/20">
                          <Image
                            width={533}
                            height={300}
                            src={post.heroImg}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        </div>
                      </Link>
                    )}
                    <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {post.tags?.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                    <h3 className="text-lg font-semibold sm:text-xl">
                      <Link href={post.url} className="hover:underline">
                        {post.title}
                      </Link>
                    </h3>
                    <div className="text-muted-foreground">
                      <TinaMarkdown content={post.excerpt} />
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <Avatar>
                        {post.author.avatar && (
                          <AvatarImage src={post.author.avatar} alt={post.author.name} className="h-8 w-8" />
                        )}
                        <AvatarFallback>
                          <UserRound size={16} strokeWidth={2} className="opacity-60" aria-hidden="true" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">{post.author.name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{post.published}</span>
                    </div>
                    <div className="flex items-center">
                      <Link href={post.url} className="inline-flex items-center font-semibold hover:underline">
                        <span>Read more</span>
                        <ArrowRight className="ml-2 size-4 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
        </FloatingBackdrop>
      </Section>
    </ErrorBoundary>
  );
}
