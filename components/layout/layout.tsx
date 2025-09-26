import React, { PropsWithChildren } from "react";
import { LayoutProvider } from "./layout-context";
import client from "../../tina/__generated__/client";
import { Header } from "./nav/header";
import { Footer } from "./nav/footer";
import { RouteTransition } from "./route-transition";
import fs from 'fs';
import path from 'path';

type LayoutProps = PropsWithChildren & {
  rawPageData?: any;
  hideChrome?: boolean;
  hideFooter?: boolean;
};

export default async function Layout({ children, rawPageData, hideChrome = false, hideFooter = false }: LayoutProps) {
  const { data: globalData } = await client.queries.global({
    relativePath: "index.json",
  },
    {
      fetchOptions: {
        next: {
          revalidate: 60,
        },
      }
    }
  );

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
    <LayoutProvider globalSettings={globalData.global} pageData={rawPageData}>
      <div className="relative min-h-screen">
        {backsplash && (
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backsplash})` }}
            aria-hidden
          />
        )}
        {!hideChrome && <Header />}
        <RouteTransition>
          <main className={hideChrome ? "overflow-x-hidden" : "overflow-x-hidden pt-20"}>
            {children}
          </main>
        </RouteTransition>
        {!hideChrome && !hideFooter && <Footer />}
      </div>
    </LayoutProvider>
  );
}
