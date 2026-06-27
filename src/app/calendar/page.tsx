'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

interface CalendarEntry {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string; medium: string };
  episodes: number | null;
  nextAiringEpisode: { airingAt: number; episode: number } | null;
}

export default function CalendarPage() {
  const { language } = useLanguage();
  const [calendar, setCalendar] = useState<Map<string, CalendarEntry[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const days = language === 'de' 
    ? ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetch('/api/anilist/calendar')
      .then(r => r.json())
      .then(d => setCalendar(new Map(Object.entries(d))))
      .catch(() => setCalendar(new Map()))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">
          {language === 'de' ? 'Kalender' : 'Calendar'}
        </h1>
        <div className="text-gray-400">{language === 'de' ? 'Lädt...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">
        {language === 'de' ? 'Kalender' : 'Calendar'}
      </h1>
      <p className="text-gray-400 mb-8">
        {language === 'de' ? 'Aktuell laufende Anime' : 'Currently airing anime'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {days.map(day => {
          const animeList = calendar.get(day) || [];
          if (animeList.length === 0) return null;

          return (
            <div key={day} className="bg-gray-800/50 rounded-lg p-4">
              <h2 className="text-lg font-bold text-white mb-3">{day}</h2>
              <div className="space-y-3">
                {animeList.map(anime => {
                  const title = anime.title.english ?? anime.title.romaji;
                  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  const ep = anime.nextAiringEpisode?.episode ?? 1;
                  const time = anime.nextAiringEpisode?.airingAt 
                    ? new Date(anime.nextAiringEpisode.airingAt * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })
                    : '';

                  return (
                    <Link
                      key={anime.id}
                      href={`/anime/${slug}?id=${anime.id}`}
                      className="flex gap-3 hover:bg-gray-700/50 focus-visible:bg-gray-700/50 p-2 rounded transition"
                    >
                      <img
                        src={anime.coverImage.medium || anime.coverImage.large}
                        alt={title}
                        className="w-16 h-20 object-cover rounded"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{title}</p>
                        <p className="text-theme-primary text-xs">
                          {language === 'de' ? 'Ep.' : 'Ep.'} {ep} {time && `• ${time}`}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {calendar.size === 0 && (
        <div className="text-gray-400 text-center py-16">
          <p>{language === 'de' ? 'Keine laufenden Anime gefunden' : 'No currently airing anime found'}</p>
        </div>
      )}
    </div>
  );
}