import React from "react";
import { Metadata } from "next";
import Script from "next/script";
import { Inter as FontSans, Lato, Nunito, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { VideoDialogProvider } from "@/components/ui/VideoDialogContext";
import VideoDialog from "@/components/ui/VideoDialog";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "@/styles.css";
import { TailwindIndicator } from "@/components/ui/breakpoint-indicator";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  weight: "400",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Eddie Kranz"
};

export default function RootLayout({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(fontSans.variable, nunito.variable, lato.variable, playfairDisplay.variable)}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-080ZT75Q6V"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-080ZT75Q6V');
          `}
        </Script>
        <VideoDialogProvider>
          {children}
          {overlay}
          <VideoDialog />
        </VideoDialogProvider>
        <TailwindIndicator />
        <SpeedInsights />
      </body>
    </html>
  );
}
