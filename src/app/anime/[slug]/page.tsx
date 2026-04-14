'use client';

import { useState, useEffect, use, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import EpisodeList from '@/components/EpisodeList';
import type { AnimeDetail, AniworldSeason } from '@/types';
import { toSlug } from '@/lib/slug';
import { useWatchlist } from '@/hooks/useWatchlist';
import { sanitizeHtml } from '@/lib/sanitize';
import { useLanguage } from '@/hooks/useLanguage';

function AnimeDetailContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const animeId = parseInt(searchParams.get('id') ?? '0');

  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [seasons, setSeasons] = useState<AniworldSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [aniworldLoading, setAniworldLoading] = useState(true);
  const [aniworldSlug, setAniworldSlug] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);

  const { add, remove, isInWatchlist, getEntry } = useWatchlist();
  const { language } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!animeId) { setLoading(false); return; }

    fetch(`/api/anilist/search?id=${animeId}`)
      .then(r => r.json())
      .then((searchData) => {
        setAnime(searchData.results?.[0] ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [animeId]);

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
    const englishTitle = anime.title.english;
    const year = anime.year;

    fetch(`/api/aniworld/find?title=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}${englishTitle ? `&english=${encodeURIComponent(englishTitle)}` : ''}`)
      .then(r => r.json())
      .then((data) => {
        if (data.found && data.seasons?.length > 0) {
          setAniworldSlug(data.slug);
          setSeasons(data.seasons);
          localStorage.setItem(`aniworldSlug:${anime.id}`, data.slug);
          
          // Also update watchlist if this anime is in watchlist
          const watchlistData = JSON.parse(localStorage.getItem('watchlist') ?? '[]');
          const entry = watchlistData.find((e: any) => e.animeId === anime.id);
          if (entry) {
            entry.aniworldSlug = data.slug;
            localStorage.setItem('watchlist', JSON.stringify(watchlistData));
          }
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

  const getStatusLabel = () => {
    if (currentEntry?.status === 'WATCHING') {
      return language === 'de' ? 'Anschauen' : 'Watching';
    }
    if (currentEntry?.status === 'COMPLETED') {
      return language === 'de' ? 'Abgeschlossen' : 'Completed';
    }
    return language === 'de' ? 'Später ansehen' : 'Plan to Watch';
  };

  const getWatchButtonLabel = () => {
    if (!currentEntry) {
      return language === 'de' ? 'Jetzt ansehen' : 'Watch Now';
    }
    if (currentEntry.status === 'COMPLETED') {
      return language === 'de' ? 'Erneut anschauen' : 'Watch Again';
    }
    const ep = currentEntry.currentEpisode ?? 1;
    return language === 'de' ? `Weiterschauen E${ep}` : `Continue E${ep}`;
  };

  const watchSeason = currentEntry?.currentSeason ?? (() => {
    const seasonMatch = title.match(/(?:Season\s*|Part\s*)(\d+)/i);
    return seasonMatch ? parseInt(seasonMatch[1]) : 1;
  })();

  const watchEpisode = currentEntry?.currentEpisode ?? 1;

  const statusLabel = getStatusLabel();

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

            <div className="mb-4 flex gap-3">
              <a
                href={`/watch/${displaySlug}/${watchSeason}/${watchEpisode}?id=${anime.id}`}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-base font-bold transition"
              >
                {getWatchButtonLabel()}
              </a>
              <button
                onClick={handleWatchlistToggle}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  inWatchlist
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
                }`}
              >
                {inWatchlist ? `✓ ${statusLabel}` : (language === 'de' ? '+ Merkliste' : '+ Watchlist')}
              </button>
            </div>

            {anime.description && (
              <div className="relative">
                <div
                  className="text-gray-300 leading-relaxed max-w-3xl"
                  style={{ maxHeight: isExpanded ? 'none' : '5.5em', overflow: 'hidden' }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(anime.description) }}
                />
                {!isExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent pointer-events-none" />
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-purple-400 hover:text-purple-300 text-sm mt-1 relative z-10"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">
            {language === 'de' ? 'Episoden' : 'Episodes'} {aniworldLoading && <span className="text-sm font-normal text-gray-400">({language === 'de' ? 'Verfügbarkeit wird geprüft...' : 'checking availability...'})</span>}
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
              defaultSeason={watchSeason}
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
