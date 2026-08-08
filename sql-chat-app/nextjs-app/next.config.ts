import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.10'],

  // Prevent Next.js from bundling Node.js-only packages that rely on native
  // bindings or require a long-running Redis connection. These are used only
  // by the standalone worker process (src/worker.ts), never inside App Router
  // route handlers.
  serverExternalPackages: ["bullmq", "ioredis"],

  async rewrites() {
    return [];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production'
              ? 'https://talk2-db-nextjs-app.vercel.app'
              : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ];
  },
} as any;

export default nextConfig;
