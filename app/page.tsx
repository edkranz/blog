import React from "react";
import client from "@/tina/__generated__/client";
import Layout from "@/components/layout/layout";
import ClientPage from "./[...urlSegments]/client-page";
import fs from 'fs';
import path from 'path';

export const revalidate = 300;

export default async function Home() {
  const data = await client.queries.page({
    relativePath: `home.mdx`,
  });

  // Random backsplash image selection
  let backsplash: string | undefined = undefined;
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const candidates = [
      path.join(publicDir, 'home', 'backsplash'),
      path.join(publicDir, 'backsplash'),
    ];
    const allFiles: { url: string }[] = [];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        const files = fs
          .readdirSync(dir)
          .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
          .map((f) => ({ url: `/${path.relative(publicDir, path.join(dir, f)).replace(/\\/g, '/')}` }));
        allFiles.push(...files);
      }
    }
    if (allFiles.length > 0) {
      const pick = allFiles[Math.floor(Math.random() * allFiles.length)];
      backsplash = pick.url;
    }
  } catch {}

  return (
    <Layout rawPageData={data} hideChrome>
      <div className="relative min-h-screen">
        {backsplash && (
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backsplash})` }}
            aria-hidden
          />
        )}
        <ClientPage {...data} />
      </div>
    </Layout>
  );
}
