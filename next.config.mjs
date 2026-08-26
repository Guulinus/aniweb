/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ['jsdom', 'cheerio'],
  images: {
    unoptimized: true,
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
      {
        protocol: 'https',
        hostname: 'media.kitsu.io',
      },
    ],
    formats: ['image/webp'],
  },
  async headers() {
    return [
      {
        // Personalized pages read from localStorage/cookies at runtime — never let the
        // browser reuse a cached document for these, or client-side fixes to what they
        // render can appear "not to work" for anyone who already has the page cached.
        source: '/(history|watchlist|settings|profile.*|watch.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/:path((?!api/|history|watchlist|settings|profile|watch).*)',
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
