'use client';
import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Movie {
  title: string;
  slug: string;
  description: string;
  posterImage: string;
  bannerImage: string;
  genres: string[];
  year: number | null;
  rating: number | null;
  streamSources: Array<{ hoster: string; embedUrl: string }>;
}

function FilmDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/filmpalast/movie/${slug}?id=${searchParams.get('id') || slug}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(setMovie)
      .catch(() => setError('Film nicht gefunden'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-800 rounded-lg mb-6" />
          <div className="h-8 bg-gray-800 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-800 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 text-center text-gray-400">
        <p>{error || 'Film nicht gefunden'}</p>
        <Link href="/filme" className="text-theme-primary mt-4 inline-block">← Zurück</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-6">
      {/* Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden mb-8">
        <img
          src={movie.bannerImage || movie.posterImage}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/80 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          {movie.posterImage && (
            <div className="flex-shrink-0 w-48">
              <img
                src={movie.posterImage}
                alt={movie.title}
                className="w-full rounded-xl shadow-2xl ring-1 ring-white/[0.1]"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {movie.title}
              {movie.year && <span className="text-gray-500 ml-2">({movie.year})</span>}
            </h1>

            {movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {movie.genres.map(g => (
                  <span key={g} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300 ring-1 ring-white/[0.06]">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {movie.description && (
              <p className="text-gray-300 text-sm leading-relaxed mb-6 max-w-2xl">
                {movie.description}
              </p>
            )}

            {movie.streamSources.length > 0 && (
              <Link
                href={`/filme/${movie.slug}/watch`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-hover text-white rounded-lg font-semibold transition shadow-lg shadow-theme-primary"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Anschauen
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FilmDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
      <div className="flex gap-6">
        <div className="w-48 h-72 bg-gray-800 rounded-xl animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-4 pt-4">
          <div className="h-8 w-64 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
    </div>}>
      <FilmDetailContent />
    </Suspense>
  );
}
