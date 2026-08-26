'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useLanguage } from '@/hooks/useLanguage';
import CoverImage from '@/components/CoverImage';
import type { WatchlistStatus, WatchlistEntry, AnimeBasic } from '@/types';

const STATUS_LABELS: Record<WatchlistStatus, { de: string; en: string }> = {
  PLANNING: { de: 'Geplant', en: 'Plan to Watch' },
  WATCHING: { de: 'Schaue', en: 'Watching' },
  COMPLETED: { de: 'Abgeschlossen', en: 'Completed' },
  ON_HOLD: { de: 'Pausiert', en: 'On Hold' },
  DROPPED: { de: 'Abgebrochen', en: 'Dropped' },
};

const STATUS_DOT: Record<WatchlistStatus, string> = {
  PLANNING: 'bg-gray-400',
  WATCHING: 'bg-theme-primary',
  COMPLETED: 'bg-green-500',
  ON_HOLD: 'bg-amber-400',
  DROPPED: 'bg-red-500',
};

const ALL_STATUSES = Object.keys(STATUS_LABELS) as WatchlistStatus[];

export default function WatchlistClient() {
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

    let cancelled = false;
    Promise.all(
      entries.map(async (entry) => {
        try {
          const res = await fetch(`/api/anilist/search?id=${entry.animeId}`);
          const json = await res.json();
          return json.results?.[0] ? [entry.animeId, json.results[0] as AnimeBasic] as const : null;
        } catch {
          return null;
        }
      })
    ).then((pairs) => {
      if (cancelled) return;
      setAnimeData(Object.fromEntries(pairs.filter(Boolean) as [number, AnimeBasic][]));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [entries]);

  const filteredEntries = filter === 'ALL' ? entries : entries.filter((e) => e.status === filter);
  const title = language === 'de' ? 'Merkliste' : 'Watchlist';

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-8">
        <h1 className="text-3xl font-bold text-white mb-6">{title}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-800 aspect-[2/3] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
        <p className="text-gray-400 text-lg mb-6">
          {language === 'de' ? 'Deine Merkliste ist leer.' : 'Your watchlist is empty.'}
        </p>
        <Link href="/browse" className="text-theme-primary hover:text-theme-hover focus-visible:text-theme-primary transition">
          {language === 'de' ? 'Anime entdecken →' : 'Browse anime →'}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 pb-16">
      <h1 className="text-3xl font-bold text-white mb-6">{title}</h1>

      <div className="flex flex-wrap gap-2 mb-8">
        <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')}>
          {language === 'de' ? 'Alle' : 'All'} ({entries.length})
        </FilterChip>
        {ALL_STATUSES.map((status) => {
          const count = entries.filter((e) => e.status === status).length;
          if (count === 0) return null;
          return (
            <FilterChip key={status} active={filter === status} onClick={() => setFilter(status)}>
              {STATUS_LABELS[status][language as 'de' | 'en']} ({count})
            </FilterChip>
          );
        })}
      </div>

      {filteredEntries.length === 0 ? (
        <p className="text-gray-400 text-center py-16">
          {language === 'de' ? 'Keine Anime mit diesem Status.' : 'No anime with this status.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredEntries.map((entry) => (
            <WatchlistCard
              key={entry.animeId}
              entry={entry}
              anime={animeData[entry.animeId]}
              language={language}
              onRemove={remove}
              onUpdateStatus={updateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        active ? 'bg-theme-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function WatchlistCard({
  entry, anime, language, onRemove, onUpdateStatus,
}: {
  entry: WatchlistEntry;
  anime?: AnimeBasic;
  language: string;
  onRemove: (id: number) => void;
  onUpdateStatus: (id: number, status: WatchlistStatus) => void;
}) {
  const title = anime?.title.english ?? anime?.title.romaji ?? entry.title;
  const slug = anime
    ? `${anime.title.english ?? anime.title.romaji}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : entry.animeSlug;
  const coverSrc = anime?.coverImage?.large || entry.coverImage;
  const progress = entry.currentEpisode && entry.totalEpisodes
    ? Math.min(100, (entry.currentEpisode / entry.totalEpisodes) * 100)
    : null;
  const continueHref = `/watch/${slug}/${entry.currentSeason || 1}/${entry.currentEpisode || 1}?id=${entry.animeId}${entry.aniworldSlug ? `&awSlug=${encodeURIComponent(entry.aniworldSlug)}` : ''}`;

  return (
    <div className="group">
      <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-[2/3] ring-1 ring-white/[0.04] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)]">
        <Link href={`/anime/${slug}?id=${entry.animeId}`} className="block w-full h-full">
          {coverSrc && (
            <CoverImage
              src={coverSrc}
              alt={title}
              color={anime?.coverImage?.color}
              sizes="(max-width: 640px) 33vw, 180px"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
        </Link>

        {/* Hover actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

        <button
          onClick={() => onRemove(entry.animeId)}
          title={language === 'de' ? 'Entfernen' : 'Remove'}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-red-500/80 focus-visible:text-white focus-visible:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <Link
          href={continueHref}
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-theme-primary flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:bg-theme-hover focus-visible:opacity-100"
          title={language === 'de' ? 'Weiterschauen' : 'Continue watching'}
        >
          <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </Link>

        {progress !== null && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
            <div className="h-full bg-theme-primary" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <Link
        href={`/anime/${slug}?id=${entry.animeId}`}
        className="block mt-2 text-sm text-white truncate hover:text-theme-primary focus-visible:text-theme-primary transition font-medium"
      >
        {title}
      </Link>

      <div className="flex items-center justify-between mt-1 gap-2">
        {entry.currentEpisode && entry.totalEpisodes ? (
          <span className="text-xs text-gray-500">
            {language === 'de' ? `Folge ${entry.currentEpisode}/${entry.totalEpisodes}` : `Ep ${entry.currentEpisode}/${entry.totalEpisodes}`}
          </span>
        ) : <span />}

        <div className="relative flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[entry.status]}`} />
          <select
            value={entry.status}
            onChange={(e) => onUpdateStatus(entry.animeId, e.target.value as WatchlistStatus)}
            className="bg-transparent text-xs text-gray-400 hover:text-white focus:text-white focus:outline-none cursor-pointer appearance-none pr-0"
            aria-label={language === 'de' ? 'Status ändern' : 'Change status'}
          >
            {ALL_STATUSES.map((status) => (
              <option key={status} value={status} className="bg-gray-900 text-white">
                {STATUS_LABELS[status][language as 'de' | 'en']}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
