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

interface FilmHistoryEntry {
  slug: string;
  title: string;
  posterImage: string;
  watchedAt: number;
}

function ContinueWatchingSection() {
  const [entries, setEntries] = useState<Array<FilmHistoryEntry & { time?: number; duration?: number }>>([]);

  useEffect(() => {
    let history: FilmHistoryEntry[] = [];
    try { history = JSON.parse(localStorage.getItem('filmHistory') ?? '[]'); } catch {}

    const withProgress = history
      .map((entry) => {
        let pos: { time: number; duration: number } | null = null;
        try {
          const raw = localStorage.getItem(`filmPosition:${entry.slug}`);
          if (raw) pos = JSON.parse(raw);
        } catch {}
        return { ...entry, time: pos?.time, duration: pos?.duration };
      })
      .filter((e) => e.time && e.duration && e.time / e.duration < 0.95)
      .slice(0, 10);

    setEntries(withProgress);
  }, []);

  if (entries.length === 0) return null;

  return (
    <section className="mb-14">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-theme-primary rounded-full flex-shrink-0" />
        <h2 className="text-lg md:text-xl font-bold text-white">Weiterschauen</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {entries.map((entry) => {
          const progressPercent = entry.time && entry.duration ? (entry.time / entry.duration) * 100 : 0;
          return (
            <Link key={entry.slug} href={`/filme/${entry.slug}/watch`} className="group block">
              <div className="relative overflow-hidden rounded-xl bg-gray-800 aspect-[2/3] ring-1 ring-white/[0.04] transition-all duration-300 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 group-hover:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)] group-focus-visible:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)]">
                <img
                  src={entry.posterImage}
                  alt={entry.title}
                  className="w-full h-full object-cover group-hover:scale-105 group-focus-visible:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/80">
                  <div className="h-full bg-theme-primary" style={{ width: `${Math.min(progressPercent, 95)}%` }} />
                </div>
              </div>
              <p className="mt-2 text-sm text-white truncate group-hover:text-theme-primary group-focus-visible:text-theme-primary transition font-medium">
                {entry.title}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function useMovieCategory(category: string) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/filmpalast/categories?category=${category}`)
      .then(r => r.json())
      .then((d: { movies?: Movie[] }) => { setMovies(d.movies ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category]);

  return { movies, loading };
}

export default function FilmePage() {
  const trending = useMovieCategory('trending');
  const newReleases = useMovieCategory('new');
  const popular = useMovieCategory('popular');
  const action = useMovieCategory('action');
  const comedy = useMovieCategory('comedy');
  const family = useMovieCategory('family');
  const adventure = useMovieCategory('adventure');
  const scifi = useMovieCategory('scifi');
  const drama = useMovieCategory('drama');

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pb-8">
      {/* Hero */}
      <div className="relative -mx-4 lg:-mx-8 overflow-hidden mb-14 pt-14 md:pt-16">
        <div className="relative h-80 md:h-[420px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />

          <div className="relative h-full flex flex-col items-start justify-end pb-12 px-8 md:px-16 z-10 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 leading-tight tracking-tight">
              Filme kostenlos streamen
            </h1>
            <p className="text-base md:text-lg text-gray-300 mb-8">
              Deutsche Filme und internationale Hits — ohne Werbung, ohne Kosten.
            </p>
            <div className="flex gap-4">
              <Link
                href="/filme/browse"
                className="px-6 py-3 bg-theme-primary hover:bg-theme-hover focus-visible:bg-theme-hover text-white rounded-lg font-semibold transition shadow-lg shadow-theme-primary"
              >
                Filme durchsuchen
              </Link>
              <Link
                href="/"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 focus-visible:bg-white/20 text-white rounded-lg font-medium transition backdrop-blur-sm"
              >
                Serien entdecken
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ContinueWatchingSection />
      <HorizontalMovieSection title="Beliebt" movies={popular.movies} loading={popular.loading} href="/filme/browse?category=popular" />
      <HorizontalMovieSection title="Trending" movies={trending.movies} loading={trending.loading} href="/filme/browse?category=trending" />
      <HorizontalMovieSection title="Neu" movies={newReleases.movies} loading={newReleases.loading} href="/filme/browse?category=new" />
      <HorizontalMovieSection title="Action" movies={action.movies} loading={action.loading} href="/filme/browse?category=action" />
      <HorizontalMovieSection title="Komödie" movies={comedy.movies} loading={comedy.loading} href="/filme/browse?category=comedy" />
      <HorizontalMovieSection title="Familie" movies={family.movies} loading={family.loading} href="/filme/browse?category=family" />
      <HorizontalMovieSection title="Abenteuer" movies={adventure.movies} loading={adventure.loading} href="/filme/browse?category=adventure" />
      <HorizontalMovieSection title="Sci-Fi" movies={scifi.movies} loading={scifi.loading} href="/filme/browse?category=scifi" />
      <HorizontalMovieSection title="Drama" movies={drama.movies} loading={drama.loading} href="/filme/browse?category=drama" />
    </div>
  );
}
