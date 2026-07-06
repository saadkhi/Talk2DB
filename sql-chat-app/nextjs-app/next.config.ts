import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.10'],
  async rewrites() {
    return [
      {
        source: '/api/chat',
        destination: `${process.env.EXPRESS_URL || 'http://localhost:8000'}/api/chat`,
      },
      {
        source: '/api/query',
        destination: `${process.env.EXPRESS_URL || 'http://localhost:8000'}/api/query`,
      },
    ];
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
