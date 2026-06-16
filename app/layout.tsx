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
    default: 'Eddie Kranz',
    template: '%s · Eddie Kranz',
  },
  description:
    'The personal site of Eddie Kranz, Software Engineer at SSW — a browser desktop you can click around: an about page, blog, projects and a few games, all inside a draggable window manager.',
  applicationName: 'Eddie Kranz',
  authors: [{ name: 'Eddie Kranz', url: SITE_URL }],
  keywords: ['Eddie Kranz', 'kranz.au', 'software engineer', 'SSW', 'blog', 'portfolio', 'Next.js'],
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: 'Eddie Kranz Blog RSS Feed' }],
    },
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: 'Eddie Kranz',
    description: 'The personal site of Eddie Kranz — a browser desktop with an about page, blog, projects & games.',
    siteName: 'Eddie Kranz',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eddie Kranz',
    description: 'The personal site of Eddie Kranz — a browser desktop with an about page, blog, projects & games.',
  },
  icons: {
    icon: [
      { url: '/icons/favicon.png', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/icons/favicon.png',
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
