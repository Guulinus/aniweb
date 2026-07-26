'use client';
import { useState, useEffect } from 'react';
import HorizontalMovieSection from '@/components/HorizontalMovieSection';
import Link from 'next/link';

interface Movie {
  title: string;
  slug: string;
  posterImage: string;
  year?: number | null;
}

export default function FilmePage() {
  const [trending, setTrending] = useState<Movie[]>([]);
  const [newReleases, setNewReleases] = useState<Movie[]>([]);
  const [action, setAction] = useState<Movie[]>([]);
  const [comedy, setComedy] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/tmdb/thumbnails?category=trending').then(r => r.json()).catch(() => ({ movies: [] })),
      fetch('/api/tmdb/thumbnails?category=new').then(r => r.json()).catch(() => ({ movies: [] })),
      fetch('/api/tmdb/thumbnails?category=action').then(r => r.json()).catch(() => ({ movies: [] })),
      fetch('/api/tmdb/thumbnails?category=comedy').then(r => r.json()).catch(() => ({ movies: [] })),
    ]).then(([t, n, a, c]) => {
      setTrending(t.movies ?? []);
      setNewReleases(n.movies ?? []);
      setAction(a.movies ?? []);
      setComedy(c.movies ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden mb-14">
        <div className="relative h-80 md:h-[420px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />

          <div className="relative h-full flex flex-col items-start justify-center px-8 md:px-16 z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-theme-soft border-theme-soft text-theme-primary text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 bg-theme-primary rounded-full animate-pulse" />
              Filme streamen
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 leading-tight">
              Filme kostenlos streamen
            </h1>
            <p className="text-base md:text-lg text-gray-300 mb-8">
              Deutsche Filme und internationale Hits
            </p>
            <Link
              href="/filme/browse"
              className="px-6 py-3 bg-theme-primary hover:bg-theme-hover text-white rounded-lg font-semibold transition shadow-lg shadow-theme-primary"
            >
              Filme durchsuchen
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <HorizontalMovieSection title="Trending" movies={trending} loading={loading} />
        <HorizontalMovieSection title="Neu" movies={newReleases} loading={loading} />
        <HorizontalMovieSection title="Action" movies={action} loading={loading} />
        <HorizontalMovieSection title="Komödie" movies={comedy} loading={loading} />
      </div>
    </div>
  );
}
