'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EpisodeList from '@/components/EpisodeList';
import type { AnimeDetail, AniworldSeason } from '@/types';
import { toSlug } from '@/lib/slug';
import { useWatchlist } from '@/hooks/useWatchlist';
import { sanitizeHtml } from '@/lib/sanitize';

function AnimeDetailContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const animeId = parseInt(searchParams.get('id') ?? '0');

  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [seasons, setSeasons] = useState<AniworldSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [aniworldLoading, setAniworldLoading] = useState(true);
  const [aniworldSlug, setAniworldSlug] = useState<string | null>(null);

  const { add, remove, isInWatchlist, getEntry } = useWatchlist();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!animeId) { setLoading(false); return; }

    fetch(`/api/anilist/search?q=${encodeURIComponent(slug.replace(/-/g, ' '))}`)
      .then(r => r.json())
      .then((searchData) => {
        const exact = (searchData.results ?? []).find((a: any) => a.id === animeId);
        setAnime(exact ?? searchData.results?.[0] ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [animeId, slug]);

  useEffect(() => {
    if (!anime) return;

    setAniworldLoading(true);

    const cachedSlug = localStorage.getItem(`aniworldSlug:${anime.id}`);
    if (cachedSlug) {
      setAniworldSlug(cachedSlug);
      fetch(`/api/aniworld/series/${cachedSlug}`)
        .then(r => r.json())
        .then((data) => {
          if (data.available && data.seasons?.length > 0) {
            setSeasons(data.seasons);
          }
        })
        .catch(() => {})
        .finally(() => setAniworldLoading(false));
      return;
    }

    const title = anime.title.romaji;
    const year = anime.year;

    fetch(`/api/aniworld/find?title=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`)
      .then(r => r.json())
      .then((data) => {
        if (data.found && data.seasons?.length > 0) {
          setAniworldSlug(data.slug);
          setSeasons(data.seasons);
          localStorage.setItem(`aniworldSlug:${anime.id}`, data.slug);
        }
      })
      .catch(() => {})
      .finally(() => setAniworldLoading(false));
  }, [anime]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-gray-400">Loading...</div>;
  }

  if (!anime) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-400">
        <p className="text-lg">Anime not found</p>
      </div>
    );
  }

  const title = anime.title.english ?? anime.title.romaji;
  const displaySlug = toSlug(title);
  const inWatchlist = isInWatchlist(anime.id);
  const currentEntry = getEntry(anime.id);

  const handleWatchlistToggle = () => {
    if (inWatchlist) {
      remove(anime.id);
    } else {
      add({
        animeId: anime.id,
        animeSlug: displaySlug,
        title,
        coverImage: anime.coverImage.large || anime.coverImage.medium,
        status: 'PLANNING',
        totalEpisodes: anime.episodes,
      });
    }
  };

  const statusLabel = currentEntry?.status === 'WATCHING' ? 'Watching'
    : currentEntry?.status === 'COMPLETED' ? 'Completed'
    : 'Plan to Watch';

  return (
    <div className="relative">
      {anime.bannerImage && (
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img
            src={anime.bannerImage}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 relative z-10" style={{ marginTop: anime.bannerImage ? '-8rem' : '2rem' }}>
        <div className="flex flex-col md:flex-row gap-6">
          <img
            src={anime.coverImage.large || anime.coverImage.medium}
            alt={title}
            className="w-48 h-72 object-cover rounded-lg shadow-xl flex-shrink-0"
          />

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
            {anime.title.romaji !== title && (
              <p className="text-gray-400 mb-4">{anime.title.romaji}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {anime.genres.map((genre) => (
                <span key={genre} className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-full">
                  {genre}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
              {anime.format && <span>{anime.format}</span>}
              {anime.status && <span>• {anime.status}</span>}
              {anime.episodes && <span>• {anime.episodes} episodes</span>}
              {anime.averageScore && <span>• {anime.averageScore}%</span>}
              {anime.year && <span>• {anime.year}</span>}
            </div>

            <div className="mb-4">
              <button
                onClick={handleWatchlistToggle}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  inWatchlist
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
                }`}
              >
                {inWatchlist ? `✓ ${statusLabel}` : '+ Watchlist'}
              </button>
            </div>

            {anime.description && (
              <div
                className="text-gray-300 leading-relaxed max-w-3xl"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(anime.description) }}
              />
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Episodes {aniworldLoading && <span className="text-sm font-normal text-gray-400">(checking availability...)</span>}
          </h2>
          {aniworldLoading ? (
            <div className="text-gray-400 py-8 text-center">Loading episodes...</div>
          ) : (
            <EpisodeList
              key={anime.id}
              animeSlug={displaySlug}
              aniworldSlug={aniworldSlug}
              animeId={anime.id}
              seasons={seasons}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-gray-400">Loading...</div>}>
      <AnimeDetailContent slug={slug} />
    </Suspense>
  );
}
