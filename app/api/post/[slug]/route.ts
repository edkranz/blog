import { getAllPosts, getPostBySlug } from '@/lib/posts';

// Prerender one static JSON per post so the OS Blog reader can lazy-load the body
// on demand (keeping post bodies out of every page's hydration payload).
export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return new Response('Not found', { status: 404 });
  return Response.json({ body: post.body });
}
