/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://kranz.au',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  // Keep the sitemap to real content pages: drop the body data endpoint and the
  // interactive app/game routes (no unique crawlable content — they're noindex'd too).
  exclude: ['/admin', '/admin/*', '/@overlay/*', '/api', '/api/*', '/api/**', '/terminal', '/minesweeper', '/tetris', '/settings', '/trash'],
  additionalPaths: async (config) => [{ loc: '/feed.xml', changefreq: 'daily', priority: 0.7 }],
  robotsTxtOptions: {
    additionalSitemaps: [],
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
    ],
  },
};
