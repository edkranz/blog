import { profile, socials, technologies } from '@/lib/eddie';
import type { Post } from '@/lib/posts';

const SITE = 'https://kranz.au';
const abs = (path: string) => (path.startsWith('http') ? path : `${SITE}${path}`);

function JsonLd({ data }: { data: object }) {
  return <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

const person = () => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: profile.name,
  url: SITE,
  image: abs(profile.avatar),
  jobTitle: profile.role,
  worksFor: { '@type': 'Organization', name: profile.company.name, url: profile.company.url },
  address: { '@type': 'PostalAddress', addressLocality: 'Sydney', addressRegion: 'NSW', addressCountry: 'AU' },
  email: `mailto:${profile.email}`,
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'The University of Sydney' },
  knowsAbout: technologies,
  sameAs: socials.filter((s) => s.id !== 'email').map((s) => s.url),
});

const crumbs = (items: { name: string; url: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.url) })),
});

const blogPosting = (post: Post) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.excerpt,
  datePublished: new Date(post.date).toISOString(),
  dateModified: new Date(post.date).toISOString(),
  author: { '@type': 'Person', name: profile.name, url: SITE },
  publisher: { '@type': 'Person', name: profile.name, url: SITE },
  mainEntityOfPage: abs(`/blog/${post.slug}`),
  url: abs(`/blog/${post.slug}`),
  ...(post.heroImg ? { image: abs(post.heroImg) } : {}),
});

/** Per-route schema.org JSON-LD for rich results. */
export function RouteJsonLd({ segments, posts }: { segments?: string[]; posts: Post[] }) {
  const [first, second] = segments ?? [];

  if (first === 'blog' && second) {
    const post = posts.find((p) => p.slug === second);
    if (post) {
      return (
        <>
          <JsonLd data={blogPosting(post)} />
          <JsonLd data={crumbs([{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blog' }, { name: post.title, url: `/blog/${post.slug}` }])} />
        </>
      );
    }
  }
  if (first === 'blog') return <JsonLd data={crumbs([{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blog' }])} />;
  if (first === 'about')
    return (
      <>
        <JsonLd data={person()} />
        <JsonLd data={crumbs([{ name: 'Home', url: '/' }, { name: 'About', url: '/about' }])} />
      </>
    );
  if (first === 'projects') return <JsonLd data={crumbs([{ name: 'Home', url: '/' }, { name: 'Projects', url: '/projects' }])} />;
  if (first === 'contact') return <JsonLd data={crumbs([{ name: 'Home', url: '/' }, { name: 'Contact', url: '/contact' }])} />;

  // Home
  return <JsonLd data={person()} />;
}
