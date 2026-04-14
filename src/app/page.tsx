'use client';

import { useState, useEffect } from 'react';
import HorizontalAnimeSection from '@/components/HorizontalAnimeSection';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useLanguage } from '@/hooks/useLanguage';
import type { AnimeBasic } from '@/types';

export default function HomePage() {
  const { language } = useLanguage();
  const heroText = language === 'de' 
    ? { main: 'Jeder Anime hier kostenlos', sub: 'Deutsche Synchronisation' }
    : { main: 'Every anime here for free', sub: 'German Dub' };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-8">
      {/* Hero section - full width, touches navbar */}
      <div className="relative -mt-8 -mx-4 overflow-hidden h-80 md:h-96">
        {/* Background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(/hero-bg.jpg)',
          }}
        />
        {/* Gradient overlay for readability */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(to right, rgba(26,26,46,0.95) 0%, rgba(26,26,46,0.7) 50%, rgba(26,26,46,0.4) 100%)'
          }}
        />
        
        {/* Bottom fade effect */}
        <div 
          className="absolute inset-x-0 bottom-0 h-24"
          style={{ 
            background: 'linear-gradient(to top, rgba(3,7,18,1) 0%, rgba(3,7,18,0) 100%)'
          }}
        />
        
        {/* Content - aligned to the left */}
        <div className="relative h-full flex flex-col items-start justify-center text-left px-8 md:px-16 z-10">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            {heroText.main}
          </h1>
          <p className="text-base md:text-lg text-gray-300 drop-shadow">
            {heroText.sub}
          </p>
          <div className="mt-6 flex gap-4">
            <a 
              href="/browse"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition"
            >
              {language === 'de' ? 'Jetzt Anschauen' : 'Watch Now'}
            </a>
            <a 
              href="/browse"
              className="px-6 py-3 bg-gray-700/80 hover:bg-gray-600 text-white rounded-lg font-medium transition"
            >
              {language === 'de' ? 'Durchsuchen' : 'Browse'}
            </a>
          </div>
        </div>
      </div>

      <ResumeWatchingSection />
      <PopularSection />
      <TrendingSection />
      <RecommendationsSection />
    </div>
  );
}

function ResumeWatchingSection() {
  const { language } = useLanguage();
  const { entries } = useWatchlist();
  const [animeData, setAnimeData] = useState<Map<number, AnimeBasic>>(new Map());
  const [positions, setPositions] = useState<Map<string, {time: number; duration: number}>>(new Map());
  const [loading, setLoading] = useState(true);
  const sectionTitle = language === 'de' ? 'Weiterschauen' : 'Continue Watching';

  const entriesWithProgress = entries
    .filter(e => e.currentEpisode && e.currentEpisode > 0)
    .sort((a, b) => (b.lastWatched ?? b.addedAt) - (a.lastWatched ?? b.addedAt));

  const baseTitleMap = new Map<string, typeof entriesWithProgress[0]>();
  entriesWithProgress.forEach(entry => {
    const baseTitle = (entry.title ?? '').replace(/season\s*\d+.*$/i, '').replace(/part\s*\d+.*$/i, '').replace(/[:-].*$/i, '').trim().toLowerCase();
    const existing = baseTitleMap.get(baseTitle);
    const existingSeason = existing?.currentSeason ?? 0;
    const entrySeason = entry.currentSeason ?? 1;
    if (!existing || entrySeason > existingSeason) {
      baseTitleMap.set(baseTitle, entry);
    }
  });

  const watchingEntries = Array.from(baseTitleMap.values()).slice(0, 6);

  useEffect(() => {
    if (watchingEntries.length === 0) {
      setLoading(false);
      return;
    }

    const posMap = new Map<string, {time: number; duration: number}>();
    watchingEntries.forEach(entry => {
      const key = `watchPosition:${entry.animeId}:${entry.animeSlug}:${entry.currentSeason}:${entry.currentEpisode}`;
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.time && data.duration && data.time / data.duration < 0.9) {
            posMap.set(key, data);
          }
        }
      } catch {}
    });
    setPositions(posMap);

    const fetchAnimeData = async () => {
      const map = new Map<number, AnimeBasic>();
      await Promise.all(watchingEntries.map(async (entry) => {
        try {
          const res = await fetch(`/api/anilist/search?id=${entry.animeId}`);
          const data = await res.json();
          if (data.results?.[0]) {
            map.set(entry.animeId, data.results[0]);
          }
        } catch {}
      }));
      setAnimeData(map);
      setLoading(false);
    };

    fetchAnimeData();
  }, [watchingEntries.length]);

  if (loading) return null;
  if (watchingEntries.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-white mb-6">{sectionTitle}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {watchingEntries.map(entry => {
          const anime = animeData.get(entry.animeId);
          if (!anime) return null;
          
          const episodeToWatch = entry.currentEpisode ?? 1;
          const seasonToWatch = entry.currentSeason ?? 1;
          const totalEps = anime?.episodes || entry.totalEpisodes || 1;
          const currentEp = entry.currentEpisode || 1;
          
          const posKey = `watchPosition:${entry.animeId}:${entry.animeSlug}:${seasonToWatch}:${episodeToWatch}`;
          const savedPos = positions.get(posKey);
          const progressPercent = savedPos 
            ? (savedPos.time / savedPos.duration) * 100 
            : ((currentEp - 1) / totalEps) * 100;
          
          return (
            <a
              key={entry.animeId}
              href={`/watch/${entry.animeSlug}/${seasonToWatch}/${episodeToWatch}?id=${entry.animeId}${entry.aniworldSlug ? `&awSlug=${entry.aniworldSlug}` : ''}`}
              className="group block"
            >
              <div className="relative overflow-hidden rounded-lg bg-gray-800 aspect-[3/4]">
                <img
                  src={entry.coverImage || anime?.coverImage?.large || anime?.coverImage?.medium}
                  alt={anime?.title?.english ?? anime?.title?.romaji}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {progressPercent > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                    <div 
                      className="h-full bg-purple-500" 
                      style={{ width: `${Math.min(progressPercent, 95)}%` }} 
                    />
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-white truncate group-hover:text-purple-400 transition">
                {entry.title}
              </p>
              <p className="text-xs text-gray-400">
                {language === 'de' ? `S${seasonToWatch} E${episodeToWatch}${savedPos ? ` (${Math.round(savedPos.time / 60)}min)` : ''}` : `S${seasonToWatch} E${episodeToWatch}${savedPos ? ` (${Math.round(savedPos.time / 60)}min)` : ''}`}
              </p>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function PopularSection() {
  const { language } = useLanguage();
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const title = language === 'de' ? 'Beliebt' : 'Popular';

  useEffect(() => {
    fetch('/api/anilist/popular?perPage=12')
      .then(r => r.json())
      .then(d => { setAnime(d.results ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return <HorizontalAnimeSection title={title} anime={anime} loading={loading} />;
}

function TrendingSection() {
  const { language } = useLanguage();
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const title = language === 'de' ? 'Trend' : 'Trending';

  useEffect(() => {
    fetch('/api/anilist/trending?perPage=12')
      .then(r => r.json())
      .then(d => { setAnime(d.results ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return <HorizontalAnimeSection title={title} anime={anime} loading={loading} />;
}

function RecommendationsSection() {
  const { language } = useLanguage();
  const { entries } = useWatchlist();
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const title = language === 'de' ? 'Könnte dir auch gefallen' : 'You Might Also Like';

  useEffect(() => {
    const fetchRecommendations = async () => {
      const watchedGenres = new Set<string>();
      
      for (const entry of entries.slice(0, 10)) {
        try {
          const res = await fetch(`/api/anilist/search?id=${entry.animeId}`);
          const data = await res.json();
          const animeData = data.results?.[0];
          if (animeData?.genres) {
            animeData.genres.forEach((g: string) => watchedGenres.add(g));
          }
        } catch {}
      }

      const genresArray = Array.from(watchedGenres);
      if (genresArray.length === 0) {
        const res = await fetch('/api/anilist/popular?perPage=12');
        const data = await res.json();
        setAnime(data.results ?? []);
        setLoading(false);
        return;
      }

      const topGenres = genresArray.slice(0, 3);
      const params = new URLSearchParams();
      params.set('perPage', '24');
      topGenres.forEach(g => params.append('genre', g));

      const res = await fetch(`/api/anilist/browse?${params}`);
      const data = await res.json();
      setAnime(data.results ?? []);
      setLoading(false);
    };

    fetchRecommendations();
  }, [entries.length]);

  return <HorizontalAnimeSection title={title} anime={anime} loading={loading} />;
}