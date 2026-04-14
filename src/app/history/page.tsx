'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

interface WatchHistoryEntry {
  animeId: number;
  animeSlug: string;
  title: string;
  episodeTitle?: string;
  coverImage: string;
  season: number;
  episode: number;
  hoster?: string;
  language?: string;
  watchedAt: number;
}

export default function HistoryPage() {
  const { language } = useLanguage();
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('watchHistory');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHistory(parsed.slice(0, 50));
      } catch {}
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('watchHistory');
    setHistory([]);
  };

  const title = language === 'de' ? 'Verlauf' : 'History';
  const emptyText = language === 'de' ? 'Noch kein Verlauf' : 'No history yet';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-sm text-gray-400 hover:text-white"
          >
            {language === 'de' ? 'Verlauf löschen' : 'Clear history'}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-gray-400">{emptyText}</p>
      ) : (
        <div className="bg-gray-800/50 rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 gap-4 p-3 bg-gray-700/50 text-sm font-medium text-gray-300">
            <div>{language === 'de' ? 'Folge' : 'Episode'}</div>
            <div>{language === 'de' ? 'Titel' : 'Title'}</div>
            <div>{language === 'de' ? 'Hoster' : 'Host'}</div>
            <div>{language === 'de' ? 'Sprache' : 'Language'}</div>
          </div>
          <div className="divide-y divide-gray-700/50">
            {history.map((entry, index) => (
              <Link
                key={`${entry.animeId}-${entry.season}-${entry.episode}-${index}`}
                href={`/watch/${entry.animeSlug}/${entry.season}/${entry.episode}?id=${entry.animeId}`}
                className="grid grid-cols-4 gap-4 p-3 text-sm hover:bg-gray-700/50 transition"
              >
                <div className="text-white">
                  {entry.season > 1 && `S${entry.season} `}E{entry.episode}
                </div>
                <div className="text-gray-300 truncate" title={entry.episodeTitle || entry.title}>
                  {entry.episodeTitle || entry.title}
                </div>
                <div className="text-gray-400">{entry.hoster || '-'}</div>
                <div className="text-gray-400">{entry.language || '-'}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
