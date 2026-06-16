import { ThemeProvider } from '@/components/os/theme-provider';
import { cn } from '@/lib/utils';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import Script from 'next/script';
import type React from 'react';

import '@/styles.css';

const openRunde = localFont({
  variable: '--font-open-runde',
  display: 'swap',
  src: [
    { path: './fonts/OpenRunde-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/OpenRunde-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/OpenRunde-Semibold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/OpenRunde-Bold.woff2', weight: '700', style: 'normal' },
  ],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const SITE_URL = 'https://kranz.au';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Eddie Kranz — Eddie OS',
    template: '%s · Eddie OS',
  },
  description:
    'Eddie OS — the personal desktop of Eddie Kranz, Software Engineer at SSW. Boot up to explore an about page, blog, projects and a few games, all inside a draggable window manager.',
  applicationName: 'Eddie OS',
  authors: [{ name: 'Eddie Kranz', url: SITE_URL }],
  keywords: ['Eddie Kranz', 'Eddie OS', 'software engineer', 'SSW', 'blog', 'portfolio', 'Next.js'],
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: 'Eddie Kranz Blog RSS Feed' }],
    },
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: 'Eddie Kranz — Eddie OS',
    description: 'Boot up Eddie OS — a desktop environment for one engineer. About, blog, projects & games.',
    siteName: 'Eddie OS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eddie Kranz — Eddie OS',
    description: 'Boot up Eddie OS — a desktop environment for one engineer.',
  },
  icons: {
    icon: '/icons/face.png',
    apple: '/icons/face.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eeefe9' },
    { media: '(prefers-color-scheme: dark)', color: '#131419' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning className={cn(openRunde.variable, jetbrains.variable)}>
      <body className='eddie-os font-sans antialiased'>
        <Script src='https://www.googletagmanager.com/gtag/js?id=G-080ZT75Q6V' strategy='afterInteractive' />
        <Script id='google-analytics' strategy='afterInteractive'>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-080ZT75Q6V');
          `}
        </Script>
        <ThemeProvider attribute='class' defaultTheme='light' enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
