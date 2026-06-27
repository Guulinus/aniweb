'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HorizontalAnimeSection from '@/components/HorizontalAnimeSection';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useLanguage } from '@/hooks/useLanguage';
import type { AnimeBasic } from '@/types';

function dedupe(anime: AnimeBasic[], exclude: Set<number>): AnimeBasic[] {
  return anime.filter(a => !exclude.has(a.id));
}

function SectionHeader({ title, href, lang }: { title: string; href?: string; lang: string }) {
  return (
    <div className="flex items-center justify-between mb-6 group">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-theme-primary rounded-full flex-shrink-0" />
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition flex items-center gap-1">
          {lang === 'de' ? 'Alle anzeigen' : 'View All'}
          <span className="text-lg leading-none">→</span>
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const { language } = useLanguage();
  const heroText = language === 'de'
    ? { main: 'Jeder Anime hier kostenlos', sub: 'Deutsche Synchronisation & japanische Originalversion' }
    : { main: 'Every anime here for free', sub: 'German Dub & Japanese Original' };

  const [allShownIds, setAllShownIds] = useState<Set<number>>(new Set());

  const onIdsSeen = useCallback((ids: number[]) => {
    setAllShownIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-8">
      {/* Hero */}
      <div className="relative -mt-8 -mx-4 overflow-hidden mb-14">
        <div className="relative h-80 md:h-[420px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />

          <div className="relative h-full flex flex-col items-start justify-center px-8 md:px-16 z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-theme-soft border-theme-soft text-theme-primary text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 bg-theme-primary rounded-full animate-pulse" />
              {language === 'de' ? 'Kostenlos streamen' : 'Free streaming'}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 leading-tight">
              {heroText.main}
            </h1>
            <p className="text-base md:text-lg text-gray-300 mb-8">
              {heroText.sub}
            </p>
            <div className="flex gap-4">
              <Link
                href="/browse"
                className="px-6 py-3 bg-theme-primary hover:bg-theme-hover focus-visible:bg-theme-hover text-white rounded-lg font-semibold transition shadow-lg shadow-theme-primary"
              >
                {language === 'de' ? 'Jetzt Anschauen' : 'Watch Now'}
              </Link>
              <Link
                href="/seasonal"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 focus-visible:bg-white/20 text-white rounded-lg font-medium transition backdrop-blur-sm"
              >
                {language === 'de' ? 'Aktuelle Saison' : 'Current Season'}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ResumeWatchingSection />
      <PopularSection onIdsSeen={onIdsSeen} />
      <TrendingSection onIdsSeen={onIdsSeen} excludeIds={allShownIds} />
      <SeasonalSection onIdsSeen={onIdsSeen} excludeIds={allShownIds} />
      <NewReleasesSection onIdsSeen={onIdsSeen} excludeIds={allShownIds} />
      <RecommendationsSection onIdsSeen={onIdsSeen} excludeIds={allShownIds} />
      <GenreRowsSection onIdsSeen={onIdsSeen} excludeIds={allShownIds} />
    </div>
  );
}

function ResumeWatchingSection() {
  const { language } = useLanguage();
  const { entries } = useWatchlist();
  const [animeData, setAnimeData] = useState<Map<number, AnimeBasic>>(new Map());
  const [positions, setPositions] = useState<Map<string, {time: number; duration: number}>>(new Map());
  const [loading, setLoading] = useState(true);
  const title = language === 'de' ? 'Weiterschauen' : 'Continue Watching';

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

  const watchingEntries = Array.from(baseTitleMap.values()).slice(0, 10);

  useEffect(() => {
    if (watchingEntries.length === 0) { setLoading(false); return; }

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
          if (data.results?.[0]) map.set(entry.animeId, data.results[0]);
        } catch {}
      }));
      setAnimeData(map);
      setLoading(false);
    };
    fetchAnimeData();
  }, [watchingEntries.length]);

  useEffect(() => {
    function handleSync() {
      if (watchingEntries.length === 0) return;
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
    }
    window.addEventListener('sync-complete', handleSync);
    return () => window.removeEventListener('sync-complete', handleSync);
  }, [watchingEntries]);

  if (loading) return null;
  if (watchingEntries.length === 0) return null;

  return (
    <section className="mb-14">
      <SectionHeader title={title} lang={language} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {watchingEntries.map(entry => {
          const anime = animeData.get(entry.animeId);
          if (!anime) return null;
          const seasonToWatch = entry.currentSeason ?? 1;
          const episodeToWatch = entry.currentEpisode ?? 1;
          const totalEps = anime?.episodes || entry.totalEpisodes || 1;
          const currentEp = entry.currentEpisode || 1;
          const posKey = `watchPosition:${entry.animeId}:${entry.animeSlug}:${seasonToWatch}:${episodeToWatch}`;
          const savedPos = positions.get(posKey);
          const progressPercent = savedPos
            ? (savedPos.time / savedPos.duration) * 100
            : ((currentEp - 1) / totalEps) * 100;

          return (
            <Link
              key={entry.animeId}
              href={`/watch/${entry.animeSlug}/${seasonToWatch}/${episodeToWatch}?id=${entry.animeId}${entry.aniworldSlug ? `&awSlug=${entry.aniworldSlug}` : ''}`}
              className="group block"
            >
              <div className="relative overflow-hidden rounded-lg bg-gray-800 aspect-[3/4] shadow-lg">
                <img
                  src={entry.coverImage || anime?.coverImage?.large || anime?.coverImage?.medium}
                  alt={anime?.title?.english ?? anime?.title?.romaji}
                  className="w-full h-full object-cover group-hover:scale-105 group-focus-visible:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300" />
                {savedPos && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/80">
                    <div className="h-full bg-theme-primary" style={{ width: `${Math.min(progressPercent, 95)}%` }} />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-0.5 text-xs font-semibold bg-theme-primary text-white rounded">
                    S{seasonToWatch} E{episodeToWatch}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-white truncate group-hover:text-theme-primary group-focus-visible:text-theme-primary transition font-medium">
                {entry.title}
              </p>
              {savedPos && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {savedPos.duration - savedPos.time > 60
                    ? `${Math.round((savedPos.duration - savedPos.time) / 60)}min ${language === 'de' ? 'verbleiben' : 'left'}`
                    : `${Math.round(savedPos.duration - savedPos.time)}s ${language === 'de' ? 'verbleiben' : 'left'}`}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PopularSection({ onIdsSeen }: { onIdsSeen: (ids: number[]) => void }) {
  const { language } = useLanguage();
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/anilist/popular?perPage=16')
      .then(r => r.json())
      .then((d: { results?: AnimeBasic[] }) => { const arr = d.results ?? []; setAnime(arr); onIdsSeen(arr.map(a => a.id)); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return <HorizontalAnimeSection title={language === 'de' ? 'Beliebt' : 'Popular'} anime={anime} loading={loading} href="/browse?sort=POPULARITY_DESC" />;
}

function TrendingSection({ onIdsSeen, excludeIds }: { onIdsSeen: (ids: number[]) => void; excludeIds: Set<number> }) {
  const { language } = useLanguage();
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/anilist/trending?perPage=16')
      .then(r => r.json())
      .then((d: { results?: AnimeBasic[] }) => {
        const arr = d.results ?? [];
        const filtered = dedupe(arr, excludeIds);
        setAnime(filtered);
        onIdsSeen(filtered.map(a => a.id));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [excludeIds.size]);

  return <HorizontalAnimeSection title={language === 'de' ? 'Trend' : 'Trending'} anime={anime} loading={loading} href="/browse?sort=TRENDING_DESC" />;
}

function SeasonalSection({ onIdsSeen, excludeIds }: { onIdsSeen: (ids: number[]) => void; excludeIds: Set<number> }) {
  const { language } = useLanguage();
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');

  useEffect(() => {
    fetch('/api/anilist/seasonal')
      .then(r => r.json())
      .then((d: { results?: AnimeBasic[]; season?: string; year?: number }) => {
        const arr = d.results ?? [];
        const filtered = dedupe(arr, excludeIds);
        setAnime(filtered);
        onIdsSeen(filtered.map(a => a.id));
        const seasonNames: Record<string, string> = {
          WINTER: language === 'de' ? 'Winter' : 'Winter',
          SPRING: language === 'de' ? 'Frühling' : 'Spring',
          SUMMER: language === 'de' ? 'Sommer' : 'Summer',
          FALL: language === 'de' ? 'Herbst' : 'Fall',
        };
        setLabel(`${seasonNames[d.season ?? ''] || d.season} ${d.year ?? ''}`);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [excludeIds.size]);

  return <HorizontalAnimeSection title={label} anime={anime} loading={loading} href="/seasonal" />;
}

function NewReleasesSection({ onIdsSeen, excludeIds }: { onIdsSeen: (ids: number[]) => void; excludeIds: Set<number> }) {
  const { language } = useLanguage();
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const title = language === 'de' ? 'Neu auf AniRoll' : 'New on AniRoll';

  useEffect(() => {
    fetch('/api/anilist/browse?sort=START_DATE_DESC&perPage=16')
      .then(r => r.json())
      .then((d: { results?: AnimeBasic[] }) => {
        const arr = d.results ?? [];
        const filtered = dedupe(arr, excludeIds);
        setAnime(filtered);
        onIdsSeen(filtered.map(a => a.id));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [excludeIds.size]);

  return <HorizontalAnimeSection title={title} anime={anime} loading={loading} />;
}

function RecommendationsSection({ onIdsSeen, excludeIds }: { onIdsSeen: (ids: number[]) => void; excludeIds: Set<number> }) {
  const { language } = useLanguage();
  const { entries } = useWatchlist();
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const title = language === 'de' ? 'Empfehlungen' : 'Recommended';

  useEffect(() => {
    const fetchRecs = async () => {
      const watchedIds = entries.slice(0, 10);
      if (watchedIds.length === 0) {
        const res = await fetch('/api/anilist/trending?perPage=16');
        const data: { results?: AnimeBasic[] } = await res.json();
        const arr = data.results ?? [];
        const filtered = dedupe(arr, excludeIds);
        setAnime(filtered);
        onIdsSeen(filtered.map(a => a.id));
        setLoading(false);
        return;
      }

      const lastEntry = watchedIds[0];
      try {
        const res = await fetch(`/api/anilist/recommendations?id=${lastEntry.animeId}`);
        const data: { results?: AnimeBasic[] } = await res.json();
        const recResults = data.results;
        if (recResults && recResults.length > 0) {
          const arr = recResults.slice(0, 16);
          const filtered = dedupe(arr, excludeIds);
          setAnime(filtered);
          onIdsSeen(filtered.map(a => a.id));
          setLoading(false);
          return;
        }
      } catch {}

      try {
        const searchRes = await fetch(`/api/anilist/search?id=${lastEntry.animeId}`);
        const searchData: { results?: Array<{ genres?: string[] }> } = await searchRes.json();
        const genres = searchData.results?.[0]?.genres;
        const genreList = genres;
        if (genreList && genreList.length > 0) {
          const params = new URLSearchParams();
          params.set('perPage', '20');
          genreList.slice(0, 2).forEach((g: string) => params.append('genre', g));
          params.set('sort', 'SCORE_DESC');
          const res = await fetch(`/api/anilist/browse?${params}`);
          const data: { results?: AnimeBasic[] } = await res.json();
          const arr = data.results ?? [];
          const filtered = dedupe(arr, excludeIds);
          setAnime(filtered);
          onIdsSeen(filtered.map(a => a.id));
          setLoading(false);
          return;
        }
      } catch {}

      fetch('/api/anilist/trending?perPage=16')
        .then(r => r.json())
        .then((d: { results?: AnimeBasic[] }) => {
          const arr = d.results ?? [];
          const filtered = dedupe(arr, excludeIds);
          setAnime(filtered);
          onIdsSeen(filtered.map(a => a.id));
          setLoading(false);
        }).catch(() => setLoading(false));
    };
    fetchRecs();
  }, [excludeIds.size, entries.length]);

  return <HorizontalAnimeSection title={title} anime={anime} loading={loading} />;
}

function GenreRowsSection({ onIdsSeen, excludeIds }: { onIdsSeen: (ids: number[]) => void; excludeIds: Set<number> }) {
  const { language } = useLanguage();
  const { entries } = useWatchlist();
  const [rows, setRows] = useState<{ genre: string; anime: AnimeBasic[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGenres = async () => {
      const genres = new Set<string>();
      for (const entry of entries.slice(0, 10)) {
        try {
          const res = await fetch(`/api/anilist/search?id=${entry.animeId}`);
          const data: { results?: Array<{ genres?: string[] }> } = await res.json();
          data.results?.[0]?.genres?.forEach((g: string) => genres.add(g));
        } catch {}
      }

      const topGenres = Array.from(genres).slice(0, 3);
      if (topGenres.length === 0) { setLoading(false); return; }

      const results: { genre: string; anime: AnimeBasic[] }[] = [];
      for (const genre of topGenres) {
        try {
          const randomPage = Math.floor(Math.random() * 5) + 1;
          const res = await fetch(`/api/anilist/browse?genre=${encodeURIComponent(genre)}&perPage=20&sort=TRENDING_DESC&page=${randomPage}`);
          const data: { results?: AnimeBasic[] } = await res.json();
          const resultsArr = data.results;
          if (resultsArr && resultsArr.length > 0) {
            const filtered = dedupe(resultsArr, excludeIds);
            if (filtered.length > 0) {
              results.push({ genre, anime: filtered });
              onIdsSeen(filtered.map(a => a.id));
            }
          }
        } catch {}
      }
      setRows(results);
      setLoading(false);
    };
    fetchGenres();
  }, [excludeIds.size, entries.length]);

  if (loading || rows.length === 0) return null;

  return (
    <>
      {rows.map(row => (
        <HorizontalAnimeSection
          key={row.genre}
          title={row.genre}
          anime={row.anime}
          loading={false}
          href={`/browse?genre=${encodeURIComponent(row.genre)}`}
        />
      ))}
    </>
  );
}
