'use client';
import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFilmWatchlist } from '@/hooks/useFilmWatchlist';
import { useToast } from '@/lib/ToastContext';

interface Movie {
  title: string;
  slug: string;
  description: string;
  posterImage: string;
  bannerImage: string;
  genres: string[];
  year: number | null;
  rating: number | null;
  runtimeMinutes: number | null;
  streamSources: Array<{ hoster: string; embedUrl: string }>;
}

function FilmDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [trailer, setTrailer] = useState<string | null>(null);

  const { add, remove, isInWatchlist } = useFilmWatchlist();
  const { showToast } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/filmpalast/movie/${slug}?id=${searchParams.get('id') || slug}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(setMovie)
      .catch(() => setError('Film nicht gefunden'))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!movie) return;
    const params = new URLSearchParams({ query: movie.title });
    if (movie.year) params.set('year', String(movie.year));
    fetch(`/api/tmdb/trailer?${params}`)
      .then(r => r.json())
      .then((data: { trailer?: string | null }) => setTrailer(data.trailer ?? null))
      .catch(() => {});
  }, [movie]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-72 bg-gray-800 rounded-xl" />
          <div className="flex gap-6">
            <div className="w-48 h-72 bg-gray-800 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-4 pt-4">
              <div className="h-8 w-64 bg-gray-800 rounded" />
              <div className="h-4 w-48 bg-gray-800 rounded" />
              <div className="h-4 w-full bg-gray-800 rounded" />
              <div className="h-4 w-3/4 bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <svg className="w-20 h-20 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg text-gray-400 mb-2">{error || 'Film nicht gefunden'}</p>
        <Link href="/filme" className="text-sm text-theme-primary hover:text-theme-hover transition">
          ← Zurück zu Filmen
        </Link>
      </div>
    );
  }

  const inWatchlist = isInWatchlist(movie.slug);

  const handleWatchlistToggle = () => {
    if (inWatchlist) {
      remove(movie.slug);
      showToast('Von Merkliste entfernt', 'error');
    } else {
      add({ slug: movie.slug, title: movie.title, posterImage: movie.posterImage, year: movie.year });
      showToast('Zur Merkliste hinzugefügt', 'success');
    }
  };

  return (
    <div className="relative">
      {/* Hero Banner — filmpalast has no distinct backdrop art, so the poster is blown up and
          heavily blurred behind a crisp foreground copy of the same poster below. */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src={movie.bannerImage || movie.posterImage}
          alt=""
          className="w-full h-full object-cover scale-110 blur-2xl opacity-50"
          loading="eager"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,15,0.4) 0%, rgba(10,10,15,0.2) 20%, rgba(10,10,15,0.4) 70%, rgba(10,10,15,1) 100%)' }}
        />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 relative z-10 -mt-40">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Poster */}
          {movie.posterImage && (
            <div className="flex-shrink-0 w-48 md:w-56">
              <div className="relative overflow-hidden rounded-xl shadow-2xl shadow-black/50">
                <img
                  src={movie.posterImage}
                  alt={movie.title}
                  className="w-full aspect-[3/4] object-cover"
                  loading="eager"
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 pt-2 md:pt-16">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-300 mb-3">
              <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded uppercase">Film</span>
              {movie.year && <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded">{movie.year}</span>}
              {movie.runtimeMinutes && <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded">{movie.runtimeMinutes} Min</span>}
              {movie.rating && (
                <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded flex items-center gap-1">
                  <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.784.57-1.838-.196-1.539-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.98 9.385c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.958z"/></svg>
                  {movie.rating.toFixed(1)}/10
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 leading-tight">{movie.title}</h1>

            {/* Genres */}
            {movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5 mt-4">
                {movie.genres.map((genre) => (
                  <Link
                    key={genre}
                    href={`/filme/browse?category=${encodeURIComponent(genre)}`}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 transition text-gray-200 text-sm rounded-full flex items-center"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              {movie.streamSources.length > 0 && (
                <Link
                  href={`/filme/${movie.slug}/watch`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-base transition shadow-lg"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    boxShadow: '0 4px 14px var(--color-primary-shadow)',
                  }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  Anschauen
                </Link>
              )}
              <button
                onClick={handleWatchlistToggle}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition border text-gray-300 hover:text-white"
                style={{
                  backgroundColor: inWatchlist ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                  borderColor: inWatchlist ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)',
                  color: inWatchlist ? '#fff' : undefined,
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill={inWatchlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={inWatchlist ? 'M5 13l4 4L19 7' : 'M12 4v16m8-8H4'} />
                </svg>
                {inWatchlist ? 'Gemerkt' : 'Merken'}
              </button>
            </div>

            {/* Description */}
            {movie.description && (
              <div className="relative max-w-3xl">
                <div
                  className="text-gray-300 text-sm leading-relaxed"
                  style={{ maxHeight: isExpanded ? 'none' : '4.5em', overflow: 'hidden' }}
                >
                  {movie.description}
                </div>
                {!isExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to top, var(--bg-primary, #0a0a0f), transparent)' }} />
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm mt-1 relative z-10 transition hover:opacity-80"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                </button>
              </div>
            )}
          </div>
        </div>

        {trailer && (
          <section className="mt-12 mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
              <h2 className="text-xl md:text-2xl font-bold text-white">Trailer</h2>
            </div>
            <div className="aspect-video max-w-4xl rounded-xl overflow-hidden shadow-2xl bg-black ring-1 ring-white/10">
              <iframe
                src={trailer}
                title={`${movie.title} Trailer`}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="w-full h-full"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function FilmDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-16">
      <div className="h-72 bg-gray-800 rounded-xl animate-pulse mb-6" />
      <div className="flex gap-6">
        <div className="w-48 h-64 bg-gray-800 rounded-xl animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-4 pt-4">
          <div className="h-4 w-48 bg-gray-800 rounded animate-pulse" />
          <div className="h-8 w-72 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-36 bg-gray-800 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-gray-800 rounded-full animate-pulse" />
            <div className="h-6 w-24 bg-gray-800 rounded-full animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>}>
      <FilmDetailContent />
    </Suspense>
  );
}
