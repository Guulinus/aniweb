'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useLanguage } from '@/hooks/useLanguage';
import type { WatchlistStatus, AnimeBasic, AniworldSeason } from '@/types';

const statusLabels: Record<WatchlistStatus, string> = {
  PLANNING: 'Plan to Watch',
  WATCHING: 'Watching',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
};

export default function WatchlistPage() {
  const { entries, remove, updateStatus } = useWatchlist();
  const { language } = useLanguage();
  const [animeData, setAnimeData] = useState<Record<number, AnimeBasic>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WatchlistStatus | 'ALL'>('ALL');

  useEffect(() => {
    if (entries.length === 0) {
      setLoading(false);
      return;
    }

    const fetchAnimeData = async () => {
      const data: Record<number, AnimeBasic> = {};
      await Promise.all(
        entries.map(async (entry) => {
          try {
            const res = await fetch(`/api/anilist/search?id=${entry.animeId}`);
            const json = await res.json();
            if (json.results?.[0]) {
              data[entry.animeId] = json.results[0];
            }
          } catch {}
        })
      );
      setAnimeData(data);
      setLoading(false);
    };

    fetchAnimeData();
  }, [entries]);

  const filteredEntries = filter === 'ALL'
    ? entries
    : entries.filter((e) => e.status === filter);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Watchlist</h1>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="w-16 h-24 bg-gray-800 rounded animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-800 rounded w-1/3 animate-pulse" />
                <div className="h-3 bg-gray-800 rounded w-1/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Watchlist</h1>
        <p className="text-gray-400 text-lg mb-6">Your watchlist is empty.</p>
        <Link href="/browse" className="text-theme-primary hover:text-theme-hover focus-visible:text-theme-primary transition">
          Browse anime →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
      <h1 className="text-3xl font-bold text-white mb-6">
        {language === 'de' ? 'Merkliste' : 'Watchlist'}
      </h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'ALL'
              ? 'bg-theme-primary text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700'
          }`}
        >
          {language === 'de' ? 'Alle' : 'All'} ({entries.length})
        </button>
        {(Object.keys(statusLabels) as WatchlistStatus[]).map((status) => {
          const count = entries.filter((e) => e.status === status).length;
          if (count === 0) return null;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === status
                  ? 'bg-theme-primary text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700'
              }`}
            >
              {statusLabels[status]} ({count})
            </button>
          );
        })}
      </div>

      {filteredEntries.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          {language === 'de' ? 'Keine Anime mit diesem Status.' : 'No anime with this status.'}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => {
            const anime = animeData[entry.animeId];
            return (
              <WatchlistEntry
                key={entry.animeId}
                entry={entry}
                anime={anime}
                language={language}
                onRemove={remove}
                onUpdateStatus={updateStatus}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface WatchlistEntryProps {
  entry: any;
  anime?: AnimeBasic;
  language: string;
  onRemove: (id: number) => void;
  onUpdateStatus: (id: number, status: WatchlistStatus) => void;
}

function WatchlistEntry({ entry, anime, language, onRemove, onUpdateStatus }: WatchlistEntryProps) {
  const [seasons, setSeasons] = useState<AniworldSeason[]>([]);
  const [seasonsLoaded, setSeasonsLoaded] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [episodeList, setEpisodeList] = useState<{number: number; title?: string; thumbnail?: string}[]>([]);
  const [tmdbThumbs, setTmdbThumbs] = useState<Record<number, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const title = anime?.title.english ?? anime?.title.romaji ?? entry.title;
  const slug = anime
    ? `${anime.title.english ?? anime.title.romaji}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : entry.animeSlug;

  const aniworldSlug = entry.aniworldSlug;

  const isCompleted = entry.currentEpisode && entry.totalEpisodes && entry.currentEpisode >= entry.totalEpisodes;

  const fetchSeasons = async () => {
    if (seasonsLoaded || !aniworldSlug) return;
    try {
      const res = await fetch(`/api/aniworld/series/${aniworldSlug}`);
      const data = await res.json();
      if (data.seasons) {
        setSeasons(data.seasons);
        setSeasonsLoaded(true);
        const defaultS = entry.currentSeason || 1;
        setActiveSeason(defaultS);
        loadEpisodesForSeason(data.seasons, defaultS);
      }
    } catch {}
  };

  const loadEpisodesForSeason = (seasonData: AniworldSeason[], seasonNum: number) => {
    const s = seasonData.find((s: any) => s.seasonNumber === seasonNum);
    if (s?.episodes) {
      setEpisodeList(s.episodes.map((e: any) => ({
        number: e.number,
        title: e.title || undefined,
        thumbnail: e.thumbnail || undefined,
      })));
    }

    if (anime?.title.romaji) {
      fetch(`/api/tmdb/thumbnails?romaji=${encodeURIComponent(anime.title.romaji)}&seasons=${seasonNum}`)
        .then(r => r.json())
        .then(tmdb => {
          if (!tmdb.thumbnails?.[seasonNum]) return;
          const thumbs = tmdb.thumbnails[seasonNum] as Record<string, string>;
          const merged: Record<number, string> = {};
          for (const [epStr, url] of Object.entries(thumbs)) {
            merged[parseInt(epStr)] = url as string;
          }
          setTmdbThumbs(merged);
        })
        .catch(() => {});
    }
  };

  const handleSeasonChange = (newSeason: number) => {
    setActiveSeason(newSeason);
    setEpisodesOpen(true);
    setTmdbThumbs({});
    loadEpisodesForSeason(seasons, newSeason);
  };

  const handleToggle = () => {
    if (episodesOpen) {
      setEpisodesOpen(false);
    } else {
      fetchSeasons().then(() => setEpisodesOpen(true));
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        /* season dropdown handled internally */
      }
    }
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition">
      {/* Header row */}
      <div className="flex items-center gap-4 p-4">
        <Link href={`/anime/${slug}?id=${entry.animeId}`} className="flex-shrink-0">
          {(anime?.coverImage?.large || entry.coverImage) && (
            <img
              src={anime?.coverImage?.large ?? entry.coverImage}
              alt={title}
              className="w-14 h-20 object-cover rounded-lg"
              loading="lazy"
            />
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={`/anime/${slug}?id=${entry.animeId}`}
            className="text-white font-medium hover:text-theme-primary focus-visible:text-theme-primary transition truncate block"
          >
            {title}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            {entry.currentEpisode && entry.totalEpisodes && (
              <p className="text-sm text-gray-400">
                {language === 'de' ? `Folge ${entry.currentEpisode} / ${entry.totalEpisodes}` : `Episode ${entry.currentEpisode} / ${entry.totalEpisodes}`}
              </p>
            )}
            {isCompleted && <span className="text-xs text-green-400">✓</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={entry.status}
            onChange={(e) => onUpdateStatus(entry.animeId, e.target.value as WatchlistStatus)}
            className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-theme-primary focus:outline-none"
          >
            {(Object.keys(statusLabels) as WatchlistStatus[]).map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          <button
            onClick={() => onRemove(entry.animeId)}
            className="p-2 text-gray-500 hover:text-red-400 focus-visible:text-red-400 transition"
            title={language === 'de' ? 'Entfernen' : 'Remove'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Episode expand section */}
      {aniworldSlug && (
        <div className="border-t border-gray-800">
          {/* Season dropdown + episode toggle */}
          <div className="flex items-center gap-3 px-4 py-3">
            {seasons.length > 1 ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => {
                    if (!seasonsLoaded) {
                      fetchSeasons();
                    } else {
                      const next = activeSeason && activeSeason < seasons.length ? activeSeason + 1 : 1;
                      handleSeasonChange(next);
                      setEpisodesOpen(true);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition"
                >
                  {activeSeason ? (activeSeason === 0 ? 'Filme' : (language === 'de' ? `Staffel ${activeSeason}` : `Season ${activeSeason}`)) : (language === 'de' ? 'Staffel' : 'Season')}
                  <svg className={`w-4 h-4 transition-transform ${episodesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            ) : seasons.length === 1 && (
              <span className="text-sm font-medium text-gray-400">
                {seasons[0].seasonNumber === 0 ? 'Filme' : (language === 'de' ? `Staffel ${seasons[0].seasonNumber}` : `Season ${seasons[0].seasonNumber}`)}
              </span>
            )}

            <button
              onClick={handleToggle}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
            >
              <svg className={`w-4 h-4 transition-transform duration-300 ${episodesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {language === 'de' ? 'Episoden' : 'Episodes'}
              {episodeList.length > 0 && ` (${episodeList.length})`}
            </button>

            <Link
              href={`/watch/${slug}/${entry.currentSeason || 1}/${entry.currentEpisode || 1}?id=${entry.animeId}${entry.aniworldSlug ? `&awSlug=${encodeURIComponent(entry.aniworldSlug)}` : ''}`}
              className="ml-auto text-sm text-theme-primary hover:text-theme-hover transition"
            >
              {language === 'de' ? 'Weiterschauen →' : 'Continue →'}
            </Link>
          </div>

          {/* Season tab row */}
          {seasons.length > 1 && episodesOpen && (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {seasons.map((s: any) => (
                <button
                  key={s.seasonNumber}
                  onClick={() => handleSeasonChange(s.seasonNumber)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    activeSeason === s.seasonNumber
                      ? 'bg-theme-primary text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {s.seasonNumber === 0 ? 'Filme' : (language === 'de' ? `Staffel ${s.seasonNumber}` : `Season ${s.seasonNumber}`)}
                </button>
              ))}
            </div>
          )}

          {/* Episode grid — animated open/close */}
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: episodesOpen ? `${Math.ceil(episodeList.length / 4) * 108 + 20}px` : '0px' }}
          >
            <div className="grid grid-cols-4 gap-2 px-4 pb-4">
              {episodeList.map(ep => {
                const isActive = ep.number === (entry.currentEpisode || 1);
                const thumb = tmdbThumbs[ep.number] || ep.thumbnail || null;
                return (
                  <Link
                    key={ep.number}
                    href={`/watch/${slug}/${activeSeason}/${ep.number}?id=${entry.animeId}${entry.aniworldSlug ? `&awSlug=${encodeURIComponent(entry.aniworldSlug)}` : ''}`}
                    className={`group block rounded-lg overflow-hidden transition-all duration-200 ${
                      isActive ? 'ring-2 ring-theme-primary ring-offset-1 ring-offset-gray-900' : ''
                    }`}
                  >
                    <div className="relative aspect-video bg-gray-800 overflow-hidden">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                            <svg className="w-4 h-4 text-theme-primary ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="px-1.5 py-1">
                      <p className={`text-[10px] font-bold leading-tight ${isActive ? 'text-theme-primary' : 'text-white'}`}>
                        E{ep.number}
                      </p>
                      {ep.title && (
                        <p className="text-[10px] text-gray-500 truncate leading-tight">{ep.title}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
