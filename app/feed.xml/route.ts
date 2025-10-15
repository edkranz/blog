import { Feed } from 'feed';
import client from '@/tina/__generated__/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eddiekranz.com';
  
  const feed = new Feed({
    title: 'Eddie Kranz Blog',
    description: 'Insights and tutorials about modern web development, UI design, and component-driven architecture.',
    id: siteUrl,
    link: siteUrl,
    language: 'en',
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, Eddie Kranz`,
    feedLinks: {
      rss2: `${siteUrl}/feed.xml`,
    },
    author: {
      name: 'Eddie Kranz',
      link: siteUrl,
    },
  });

  let posts = await client.queries.postConnection({
    sort: 'date',
    last: 1
  });
  const allPosts = posts;

  if (!allPosts.data.postConnection.edges) {
    return new Response(feed.rss2(), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }

  while (posts.data?.postConnection.pageInfo.hasPreviousPage) {
    posts = await client.queries.postConnection({
      sort: 'date',
      before: posts.data.postConnection.pageInfo.endCursor,
    });

    if (!posts.data.postConnection.edges) {
      break;
    }

    allPosts.data.postConnection.edges.push(...posts.data.postConnection.edges.reverse());
  }

  allPosts.data.postConnection.edges?.forEach((edge) => {
    const post = edge?.node;
    if (!post) return;

    const postUrl = `${siteUrl}/posts/${post._sys.breadcrumbs.join('/')}`;
    
    feed.addItem({
      title: post.title || 'Untitled',
      id: postUrl,
      link: postUrl,
      description: post.excerpt || '',
      date: new Date(post.date || Date.now()),
      author: [{
        name: post.author?.name || 'Eddie Kranz',
      }],
    });
  });

  return new Response(feed.rss2(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
