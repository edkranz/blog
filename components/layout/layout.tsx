import React, { PropsWithChildren } from "react";
import { LayoutProvider } from "./layout-context";
import client from "../../tina/__generated__/client";
import { Header } from "./nav/header";
import { Footer } from "./nav/footer";

type LayoutProps = PropsWithChildren & {
  rawPageData?: any;
  hideChrome?: boolean;
};

export default async function Layout({ children, rawPageData, hideChrome = false }: LayoutProps) {
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

  return (
    <LayoutProvider globalSettings={globalData.global} pageData={rawPageData}>
      {!hideChrome && <Header />}
      <main className={hideChrome ? "overflow-x-hidden" : "overflow-x-hidden pt-20"}>
        {children}
      </main>
      {!hideChrome && <Footer />}
    </LayoutProvider>
  );
}
