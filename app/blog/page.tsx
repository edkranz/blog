import Layout from '@/components/layout/layout';
import client from '@/tina/__generated__/client';
import PostsClientPage from '../posts/client-page';
import { FloatingBackdrop } from '@/components/layout/floating-backdrop';

export const revalidate = 300;

export default async function BlogPage() {
  let posts = await client.queries.postConnection({
    sort: 'date',
    last: 1
  });
  const allPosts = posts;

  if (!allPosts.data.postConnection.edges) {
    return [] as any;
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

  return (
    <Layout rawPageData={allPosts.data} hideFooter>
      <PostsClientPage {...allPosts} />
    </Layout>
  );
}


