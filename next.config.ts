import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ['jsdom'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
      },
      {
        protocol: 'https',
        hostname: 'img.anilist.co',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    formats: ['image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path((?!api/).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ['react', 'react-dom', 'artplayer', 'hls.js'],
  },

};

export default nextConfig;