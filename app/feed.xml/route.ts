import { getPublishedPosts } from '@/lib/posts';
import { Feed } from 'feed';

export const dynamic = 'force-static';

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kranz.au';

  const feed = new Feed({
    title: 'Eddie Kranz Blog',
    description: 'Writing about software development, AI workflows and tinkering — from Eddie Kranz.',
    id: siteUrl,
    link: siteUrl,
    language: 'en',
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, Eddie Kranz`,
    feedLinks: { rss2: `${siteUrl}/feed.xml` },
    author: { name: 'Eddie Kranz', link: siteUrl },
  });

  for (const post of getPublishedPosts()) {
    const postUrl = `${siteUrl}/blog/${post.slug}`;
    feed.addItem({
      title: post.title,
      id: postUrl,
      link: postUrl,
      description: post.excerpt,
      date: new Date(post.date),
      author: [{ name: 'Eddie Kranz' }],
    });
  }

  return new Response(feed.rss2(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
