'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { AniworldSeason } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';

interface EpisodeListProps {
  animeSlug: string;
  aniworldSlug: string | null;
  animeId: number;
  seasons: AniworldSeason[];
  defaultSeason?: number | null;
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
        const globalEp = globalOffset + ep.number;
        const keyPattern = `watchPosition:${animeId}:*:${season.seasonNumber}:${ep.number}`;
        const allKeys = Object.keys(localStorage);
        const foundKey = allKeys.find(k => k.includes(`watchPosition:${animeId}`) && k.endsWith(`:${season.seasonNumber}:${ep.number}`));
        if (foundKey) {
          try {
            const data = JSON.parse(localStorage.getItem(foundKey) || '{}');
            if (data.time) progress[globalEp] = data.time;
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

export default function EpisodeList({ animeSlug, aniworldSlug, animeId, seasons, defaultSeason }: EpisodeListProps) {
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
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="flex flex-wrap gap-2 mb-6">
        {sortedSeasons.map((season) => {
          const isActive = activeSeason === season.seasonNumber;
          return (
            <button
              key={season.seasonNumber}
              onClick={() => setActiveSeason(season.seasonNumber)}
              className={`px-6 py-2.5 text-sm font-medium rounded-full transition-all duration-200 ${isActive ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600 hover:text-white'}`}
            >
              {season.seasonNumber === 0 ? 'Movies' : (language === 'de' ? `Staffel ${season.seasonNumber}` : `Season ${season.seasonNumber}`)}
            </button>
          );
        })}
      </div>

      {currentSeason && (
        <div>
          <p className="text-sm text-gray-400 mb-3">
            {currentSeason.seasonNumber === 0 ? 'Movies' : (language === 'de' ? `Staffel ${currentSeason.seasonNumber}` : `Season ${currentSeason.seasonNumber}`)} 
            <span className="text-gray-600 mx-2">•</span> 
            {currentSeason.episodes.length} {language === 'de' ? 'Episoden' : 'episodes'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {currentSeason.episodes.map((ep) => {
              const globalEpNum = globalEpisodeOffset + ep.number;
              const isWatched = isClient && watchData.watched.includes(globalEpNum);
              const progress = getProgressInfo(globalEpNum);
              const isLastWatched = isClient && watchData.lastWatched === globalEpNum;
              
              return (
                <Link
                  key={ep.number}
                  href={`/watch/${animeSlug}/${activeSeason}/${ep.number}?id=${animeId}&title=${encodeURIComponent(ep.title ?? '')}${aniworldSlug ? `&awSlug=${encodeURIComponent(aniworldSlug)}` : ''}`}
                  onClick={() => handleEpisodeClick(ep.number)}
                  className={`group flex flex-col py-3 px-3 rounded-lg transition-all duration-200 ${isLastWatched ? 'bg-violet-500/20 border border-violet-500/50' : isWatched ? 'bg-gray-700/30 border border-gray-700 hover:border-violet-500' : 'bg-gray-700/50 hover:bg-violet-500'}`}
                >
                  <div className="flex items-center justify-center">
                    <span className={`font-medium text-sm ${isWatched ? 'text-violet-400' : 'text-white group-hover:text-white'}`}>
                      {language === 'de' ? `Folge ${globalEpNum}` : `E ${globalEpNum}`}
                    </span>
                    {ep.title && <span className={`text-xs ml-1 truncate max-w-[100px] ${isWatched ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-300'}`}> - {ep.title}</span>}
                  </div>
                  
                  {progress && (
                    <div className="mt-1">
                      <span className={`text-xs ${isLastWatched ? 'text-violet-400' : 'text-gray-500'}`}>{formatTime(progress.remaining)}</span>
                      <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${progress.percent}%` }} />
                      </div>
                    </div>
                  )}
                  
                  {isLastWatched && !progress && (
                    <span className="text-xs text-violet-400 mt-1 text-center">{language === 'de' ? 'Weiterschauen' : 'Continue'}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
