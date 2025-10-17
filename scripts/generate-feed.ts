import { Feed } from 'feed';
import { writeFileSync, readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join, extname, basename } from 'path';
import matter from 'gray-matter';

interface PostFrontmatter {
  title?: string;
  excerpt?: string;
  date?: string;
  author?: string;
}

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: Date;
}

function getAllPosts(dir: string, basePath: string = ''): Post[] {
  const posts: Post[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      posts.push(...getAllPosts(fullPath, join(basePath, entry)));
    } else if (extname(entry) === '.mdx' || extname(entry) === '.md') {
      const content = readFileSync(fullPath, 'utf-8');
      const { data } = matter(content);
      const frontmatter = data as PostFrontmatter;

      const slug = join(basePath, basename(entry, extname(entry)));

      posts.push({
        slug,
        title: frontmatter.title || 'Untitled',
        excerpt: frontmatter.excerpt || '',
        date: new Date(frontmatter.date || Date.now()),
      });
    }
  }

  return posts;
}

async function generateFeed() {
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

  const postsDir = resolve(process.cwd(), 'content', 'posts');
  const posts = getAllPosts(postsDir);

  posts.sort((a, b) => b.date.getTime() - a.date.getTime());

  posts.forEach((post) => {
    const postUrl = `${siteUrl}/posts/${post.slug}`;
    
    feed.addItem({
      title: post.title,
      id: postUrl,
      link: postUrl,
      description: post.excerpt,
      date: post.date,
      author: [{
        name: 'Eddie Kranz',
      }],
    });
  });

  const outputPath = resolve(process.cwd(), 'public', 'feed.xml');
  writeFileSync(outputPath, feed.rss2());
  console.log(`✓ Generated feed.xml with ${posts.length} posts at ${outputPath}`);
}

generateFeed().catch((error) => {
  console.error('Failed to generate feed:', error);
  process.exit(1);
});
