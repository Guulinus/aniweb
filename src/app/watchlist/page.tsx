'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Skeleton } from '@/components/Skeleton';
import type { WatchlistStatus, AnimeBasic } from '@/types';

const statusLabels: Record<WatchlistStatus, string> = {
  PLANNING: 'Plan to Watch',
  WATCHING: 'Watching',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
};

export default function WatchlistPage() {
  const { entries, remove, updateStatus } = useWatchlist();
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
          } catch {
            // skip
          }
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Watchlist</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'ALL'
              ? 'bg-theme-primary text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700'
          }`}
        >
          All ({entries.length})
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
        <p className="text-gray-400 text-center py-8">No anime with this status.</p>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const anime = animeData[entry.animeId];
            const title = anime?.title.english ?? anime?.title.romaji ?? entry.title;
            const slug = anime
              ? `${anime.title.english ?? anime.title.romaji}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
              : entry.animeSlug;

            const isCompleted = entry.currentEpisode && entry.totalEpisodes && entry.currentEpisode >= entry.totalEpisodes;

            return (
              <div
                key={entry.animeId}
                className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 focus-visible:border-gray-700 transition"
              >
                <Link href={`/anime/${slug}?id=${entry.animeId}`} className="flex-shrink-0">
                  {(anime?.coverImage?.medium || entry.coverImage) && (
                    <img
                      src={anime?.coverImage?.medium ?? entry.coverImage}
                      alt={title}
                      className="w-16 h-24 object-cover rounded"
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
                  {entry.currentEpisode && entry.totalEpisodes && (
                    <p className="text-sm text-gray-400 mt-1">
                      Episode {entry.currentEpisode} / {entry.totalEpisodes}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {isCompleted ? '✓ Completed' : statusLabels[entry.status]}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={entry.status}
                    onChange={(e) => updateStatus(entry.animeId, e.target.value as WatchlistStatus)}
                    className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-theme-primary focus:outline-none"
                  >
                    {(Object.keys(statusLabels) as WatchlistStatus[]).map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => remove(entry.animeId)}
                    className="p-2 text-gray-500 hover:text-red-400 focus-visible:text-red-400 transition"
                    title="Remove from watchlist"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
