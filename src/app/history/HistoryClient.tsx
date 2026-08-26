'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

interface WatchHistoryEntry {
  animeId: number;
  animeSlug: string;
  title: string;
  episodeTitle?: string;
  coverImage?: string;
  thumbnail?: string;
  season: number;
  episode: number;
  hoster?: string;
  language?: string;
  watchedAt?: number;
  timestamp?: number;
}

function formatRelativeTime(ms: number | undefined, lang: string): string {
  if (!ms) return '';
  const diffSec = Math.round((ms - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === 'de' ? 'de' : 'en', { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  return rtf.format(Math.round(diffSec / 2592000), 'month');
}

export default function HistoryClient() {
  const { language } = useLanguage();
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('watchHistory');
    if (!stored) return;
    let parsed: WatchHistoryEntry[] = [];
    try { parsed = JSON.parse(stored).slice(0, 50); } catch { return; }
    setHistory(parsed);

    let cancelled = false;
    let working = parsed;
    const applyPatch = (patch: (e: WatchHistoryEntry) => WatchHistoryEntry) => {
      if (cancelled) return;
      working = working.map(patch);
      setHistory(working);
      localStorage.setItem('watchHistory', JSON.stringify(working));
    };

    const missingIds = Array.from(new Set(
      parsed.filter(e => !e.coverImage && e.animeId).map(e => e.animeId)
    ));
    const coverFetch = missingIds.length === 0 ? Promise.resolve() : Promise.all(
      missingIds.map(async (id) => {
        try {
          const res = await fetch(`/api/anilist/search?id=${id}`);
          const json = await res.json();
          const cover = json.results?.[0]?.coverImage?.large ?? json.results?.[0]?.coverImage?.medium;
          return cover ? [id, cover] as const : null;
        } catch {
          return null;
        }
      })
    ).then((pairs) => {
      const covers = new Map(pairs.filter(Boolean) as [number, string][]);
      if (covers.size === 0) return;
      applyPatch(e => covers.has(e.animeId) && !e.coverImage ? { ...e, coverImage: covers.get(e.animeId) } : e);
    });

    // Entries missing the per-episode thumbnail: group by title+season to minimize TMDB calls.
    const missingThumbKeys = new Map<string, { title: string; season: number }>();
    for (const e of parsed) {
      if (!e.thumbnail && e.title && e.season) missingThumbKeys.set(`${e.title}::${e.season}`, { title: e.title, season: e.season });
    }
    const thumbFetch = missingThumbKeys.size === 0 ? Promise.resolve() : Promise.all(
      Array.from(missingThumbKeys.values()).map(async ({ title, season }) => {
        try {
          const res = await fetch(`/api/tmdb/thumbnails?romaji=${encodeURIComponent(title)}&seasons=${season}`);
          const json = await res.json();
          const thumbs = json.thumbnails?.[season] as Record<string, string> | undefined;
          return thumbs ? [`${title}::${season}`, thumbs] as const : null;
        } catch {
          return null;
        }
      })
    ).then((pairs) => {
      const byKey = new Map(pairs.filter(Boolean) as [string, Record<string, string>][]);
      if (byKey.size === 0) return;
      applyPatch(e => {
        if (e.thumbnail) return e;
        const thumbs = byKey.get(`${e.title}::${e.season}`);
        const thumb = thumbs?.[String(e.episode)];
        return thumb ? { ...e, thumbnail: thumb } : e;
      });
    });

    Promise.all([coverFetch, thumbFetch]);
    return () => { cancelled = true; };
  }, []);

  const persist = (updated: WatchHistoryEntry[]) => {
    setHistory(updated);
    localStorage.setItem('watchHistory', JSON.stringify(updated));
  };

  const clearHistory = () => {
    localStorage.removeItem('watchHistory');
    setHistory([]);
  };

  const removeEntry = (index: number) => {
    persist(history.filter((_, i) => i !== index));
  };

  const title = language === 'de' ? 'Verlauf' : 'History';
  const emptyText = language === 'de' ? 'Noch kein Verlauf' : 'No history yet';

  return (
    <div className="max-w-3xl mx-auto px-4 pt-20 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-sm text-gray-400 hover:text-red-400 focus-visible:text-red-400 transition"
          >
            {language === 'de' ? 'Verlauf löschen' : 'Clear history'}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-gray-400">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {history.map((entry, index) => {
            const episodeLabel = entry.season > 1
              ? `S${entry.season} · E${entry.episode}`
              : `E${entry.episode}`;
            const when = formatRelativeTime(entry.watchedAt ?? entry.timestamp, language);

            return (
              <div
                key={`${entry.animeId}-${entry.season}-${entry.episode}-${index}`}
                className="group flex items-center gap-4 bg-gray-900/60 hover:bg-gray-900 border border-gray-800 rounded-xl p-3 transition"
              >
                <Link
                  href={`/watch/${entry.animeSlug}/${entry.season}/${entry.episode}?id=${entry.animeId}`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <div className="relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                    {entry.thumbnail || entry.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.thumbnail || entry.coverImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{entry.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                      <span className="text-theme-primary font-medium">{episodeLabel}</span>
                      {entry.episodeTitle && <span className="truncate">· {entry.episodeTitle}</span>}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right hidden sm:block">
                    {when && <p className="text-xs text-gray-500">{when}</p>}
                    {entry.language && <p className="text-[11px] text-gray-600 mt-0.5">{entry.language}</p>}
                  </div>
                </Link>

                <button
                  onClick={() => removeEntry(index)}
                  title={language === 'de' ? 'Entfernen' : 'Remove'}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-gray-800 focus-visible:text-red-400 focus-visible:bg-gray-800 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
