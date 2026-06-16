import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  // Allow loading the dev server from these origins (localhost is default; add loopback IP & LAN dev).
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    const headers = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
    ];
    return [{ source: '/(.*)', headers }];
  },
};

export default nextConfig;
