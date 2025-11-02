import React, { PropsWithChildren } from "react";
import { LayoutProvider } from "./layout-context";
import client from "../../tina/__generated__/client";
import { Header } from "./nav/header";
import { Footer } from "./nav/footer";
import { RouteTransition } from "./route-transition";

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

  const backsplash = globalData.global.backgroundImage;

  return (
    <LayoutProvider globalSettings={globalData.global} pageData={rawPageData}>
      <div className="relative min-h-screen">
        {backsplash && (
          <div
            className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat bg-fixed"
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
