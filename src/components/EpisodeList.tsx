'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { AniworldSeason, RelatedMovie } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';

interface EpisodeListProps {
  animeSlug: string;
  aniworldSlug: string | null;
  animeId: number;
  seasons: AniworldSeason[];
  defaultSeason?: number | null;
  episodeThumbnails?: Record<number, string> | null;
  movies?: RelatedMovie[];
  movieSlugs?: Record<number, { slug: string; season: number; episode: number }>;
}

const DEFAULT_EPISODE_DURATION = 24 * 60;

interface WatchData {
  watched: number[];
  progress: Record<number, number>;
  lastWatched: number | null;
}

function loadWatchData(animeId: number, seasonData?: {seasonNumber: number; episodes: {number: number}[]}[]): WatchData {
  if (typeof window === 'undefined') return { watched: [], progress: {}, lastWatched: null };

  const watched = localStorage.getItem(`watched:${animeId}`);
  const lastWatched = localStorage.getItem(`lastWatched:${animeId}`);

  const progress: Record<number, number> = {};

  if (seasonData) {
    let globalOffset = 0;
    for (const season of seasonData) {
      for (const ep of season.episodes) {
        const allKeys = Object.keys(localStorage);
        const foundKey = allKeys.find(k => k.includes(`watchPosition:${animeId}`) && k.endsWith(`:${season.seasonNumber}:${ep.number}`));
        if (foundKey) {
          try {
            const data = JSON.parse(localStorage.getItem(foundKey) || '{}');
            if (data.time) progress[globalOffset + ep.number] = data.time;
          } catch (e) {}
        }
      }
      globalOffset += season.episodes.length;
    }
  }

  return {
    watched: watched ? JSON.parse(watched) : [],
    progress,
    lastWatched: lastWatched ? parseInt(lastWatched) : null,
  };
}

function saveWatchProgress(animeId: number, episode: number) {
  if (typeof window === 'undefined') return;
  const data = loadWatchData(animeId);
  if (!data.watched.includes(episode)) {
    data.watched.push(episode);
    localStorage.setItem(`watched:${animeId}`, JSON.stringify(data.watched));
  }
  localStorage.setItem(`lastWatched:${animeId}`, episode.toString());
}

export default function EpisodeList({ animeSlug, aniworldSlug, animeId, seasons, defaultSeason, episodeThumbnails, movies, movieSlugs }: EpisodeListProps) {
  const { language } = useLanguage();
  const [activeSeason, setActiveSeason] = useState<number>(defaultSeason || 1);
  const [watchData, setWatchData] = useState<WatchData>({ watched: [], progress: {}, lastWatched: null });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setWatchData(loadWatchData(animeId, seasons));
  }, [animeId, seasons]);

  const sortedSeasons = useMemo(() => [...seasons].sort((a, b) => a.seasonNumber - b.seasonNumber), [seasons]);

  const noDubText = language === 'de' ? 'Keine deutsche Synchronisation verfügbar' : 'No German dub available for this anime';
  const notAvailableText = language === 'de' ? 'Dieses Anime ist nicht auf Aniworld.to verfügbar' : 'This anime is not available on Aniworld.to';

  if (seasons.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 text-center">
        <p className="text-gray-400">{noDubText}</p>
        <p className="text-sm text-gray-500 mt-2">{notAvailableText}</p>
      </div>
    );
  }

  const currentSeason = sortedSeasons.find(s => s.seasonNumber === activeSeason);

  const globalEpisodeOffset = useMemo(() => {
    let offset = 0;
    for (const season of sortedSeasons) {
      if (season.seasonNumber < activeSeason) offset += season.episodes.length;
    }
    return offset;
  }, [sortedSeasons, activeSeason]);

  const handleEpisodeClick = (episode: number) => {
    saveWatchProgress(animeId, globalEpisodeOffset + episode);
    setWatchData(loadWatchData(animeId));
  };

  const getProgressInfo = (globalEpNum: number) => {
    if (!isClient) return null;
    const secondsWatched = watchData.progress[globalEpNum] || 0;
    if (secondsWatched === 0) return null;
    const remaining = Math.max(0, DEFAULT_EPISODE_DURATION - secondsWatched);
    const percent = Math.min(100, (secondsWatched / DEFAULT_EPISODE_DURATION) * 100);
    return { remaining, percent };
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return language === 'de' ? 'Fertig' : 'Done';
    const mins = Math.ceil(seconds / 60);
    return language === 'de' ? `${mins}min übrig` : `${mins}min left`;
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {sortedSeasons.map((season) => {
          const isActive = activeSeason === season.seasonNumber;
          return (
            <button
              key={season.seasonNumber}
              onClick={() => setActiveSeason(season.seasonNumber)}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center ${
                isActive
                  ? 'bg-theme-primary text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white focus-visible:bg-gray-700 focus-visible:text-white'
              }`}
            >
              {season.seasonNumber === 0 ? 'Filme' : (language === 'de' ? `Staffel ${season.seasonNumber}` : `Season ${season.seasonNumber}`)}
            </button>
          );
        })}
        {movies && movies.length > 0 && (
          <button
            onClick={() => setActiveSeason(-1)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center ${
              activeSeason === -1
                ? 'bg-theme-primary text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white focus-visible:bg-gray-700 focus-visible:text-white'
            }`}
          >
            {language === 'de' ? 'Filme' : 'Movies'}
          </button>
        )}
      </div>

      {activeSeason === -1 && movies && movies.length > 0 ? (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {movies.length} {language === 'de' ? 'Filme' : 'Movies'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {movies.map((movie) => {
              const title = movie.title.english || movie.title.romaji;
              const cover = movie.coverImage?.large || movie.coverImage?.medium;
              const movieSlug = movieSlugs?.[movie.id];
              const detailHref = `/anime/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}?id=${movie.id}`;
              const watchHref = movieSlug ? `/watch/${movieSlug.slug}/${movieSlug.season}/${movieSlug.episode}?id=${movie.id}` : detailHref;
              return (
                <Link
                  key={movie.id}
                  href={watchHref}
                  className="group block rounded-xl overflow-hidden transition-all duration-200 bg-gray-800/50 hover:bg-gray-800"
                >
                  <div className="relative aspect-[3/4] bg-gray-800 overflow-hidden">
                    {cover ? (
                      <img
                        src={cover}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 group-focus-visible:scale-100 transition-transform">
                        <svg className="w-6 h-6 text-gray-900 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {!movieSlug && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-900/80 text-gray-300">
                        Details
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-theme-primary transition">
                      {title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {movie.year && <span className="text-xs text-gray-500">{movie.year}</span>}
                      <span className="text-xs text-gray-500 capitalize">{movie.relationType.toLowerCase().replace('_', ' ')}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : activeSeason === -1 || !currentSeason ? null : (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {currentSeason.seasonNumber === 0 ? 'Filme' : (language === 'de' ? `Staffel ${currentSeason.seasonNumber}` : `Season ${currentSeason.seasonNumber}`)}
            <span className="text-gray-600 mx-2">•</span>
            {currentSeason.episodes.length} {language === 'de' ? 'Episoden' : 'Episodes'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {currentSeason.episodes.map((ep) => {
              const globalEpNum = globalEpisodeOffset + ep.number;
              const isWatched = isClient && watchData.watched.includes(globalEpNum);
              const progress = getProgressInfo(globalEpNum);
              const isLastWatched = isClient && watchData.lastWatched === globalEpNum;
              const thumb = episodeThumbnails?.[globalEpisodeOffset + ep.number] ?? null;

              return (
                <Link
                  key={ep.number}
                  href={`/watch/${animeSlug}/${activeSeason}/${ep.number}?id=${animeId}&title=${encodeURIComponent(ep.title ?? '')}${aniworldSlug ? `&awSlug=${encodeURIComponent(aniworldSlug)}` : ''}`}
                  onClick={() => handleEpisodeClick(ep.number)}
                  className={`group block rounded-xl overflow-hidden transition-all duration-200 ${
                    isLastWatched
                      ? 'ring-2 ring-theme-primary ring-offset-2 ring-offset-gray-950'
                      : isWatched
                        ? 'opacity-70 hover:opacity-100'
                        : ''
                  }`}
                >
                  <div className="relative aspect-video bg-gray-800 overflow-hidden">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 group-focus-visible:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 group-focus-visible:scale-100 transition-transform">
                        <svg className="w-5 h-5 text-gray-900 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {isWatched && (
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {isLastWatched && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded" style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                        {language === 'de' ? 'Weiter' : 'Continue'}
                      </div>
                    )}
                  </div>
                  <div className="px-2.5 py-2.5">
                    <p className={`text-xs font-bold ${isWatched ? 'text-gray-400' : 'text-white'}`}>
                        S{activeSeason}E{ep.number}
                    </p>
                    {ep.title && (
                      <p className={`text-xs mt-0.5 truncate ${isWatched ? 'text-gray-600' : 'text-gray-400'}`}>
                        {ep.title}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-gray-500">24m</span>
                      {progress && (
                        <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden max-w-[60px]">
                          <div className="h-full bg-theme-primary transition-all duration-300" style={{ width: `${progress.percent}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
