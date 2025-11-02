import React from 'react';
import client from '@/tina/__generated__/client';
import Layout from '@/components/layout/layout';
import PostClientPage from '@/app/posts/[...urlSegments]/client-page';

export const revalidate = 300;

export default async function AboutPage() {
  const data = await client.queries.post({
    relativePath: 'about.mdx',
  });

  return (
    <Layout rawPageData={data} hideFooter>
      <PostClientPage {...data} />
    </Layout>
  );
}

