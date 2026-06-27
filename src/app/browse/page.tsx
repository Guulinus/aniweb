'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AnimeGrid from '@/components/AnimeGrid';
import GenreFilter from '@/components/GenreFilter';
import { SkeletonGrid } from '@/components/Skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import type { AnimeBasic } from '@/types';

function useTranslations() {
  const { language } = useLanguage();
  return {
    sortOptions: [
      { value: 'POPULARITY_DESC', label: language === 'de' ? 'Beliebt' : 'Most Popular' },
      { value: 'TRENDING_DESC', label: language === 'de' ? 'Trend' : 'Trending' },
      { value: 'SCORE_DESC', label: language === 'de' ? 'Beste Bewertung' : 'Highest Score' },
      { value: 'TITLE_ROMAJI', label: language === 'de' ? 'Titel A-Z' : 'Title A-Z' },
    ],
    statusOptions: [
      { value: '', label: language === 'de' ? 'Alle' : 'All' },
      { value: 'RELEASING', label: language === 'de' ? 'Laufend' : 'Airing' },
      { value: 'FINISHED', label: language === 'de' ? 'Abgeschlossen' : 'Finished' },
      { value: 'NOT_YET_RELEASED', label: language === 'de' ? 'Angekündigt' : 'Upcoming' },
    ],
    formatOptions: [
      { value: '', label: language === 'de' ? 'Alle' : 'All' },
      { value: 'TV', label: 'TV' },
      { value: 'MOVIE', label: 'Movie' },
      { value: 'OVA', label: 'OVA' },
      { value: 'ONA', label: 'ONA' },
    ],
    seasonOptions: [
      { value: '', label: language === 'de' ? 'Alle' : 'All' },
      { value: 'WINTER', label: language === 'de' ? 'Winter' : 'Winter' },
      { value: 'SPRING', label: language === 'de' ? 'Frühling' : 'Spring' },
      { value: 'SUMMER', label: language === 'de' ? 'Sommer' : 'Summer' },
      { value: 'FALL', label: language === 'de' ? 'Herbst' : 'Fall' },
    ],
    browse: language === 'de' ? 'Durchsuchen' : 'Browse',
    sortBy: language === 'de' ? 'Sortieren nach' : 'Sort By',
    status: language === 'de' ? 'Status' : 'Status',
    format: language === 'de' ? 'Format' : 'Format',
    season: language === 'de' ? 'Saison' : 'Season',
    yearLabel: language === 'de' ? 'Jahr' : 'Year',
    page: language === 'de' ? 'Seite' : 'Page',
    nextPage: language === 'de' ? 'Nächste' : 'Next',
    previousPage: language === 'de' ? 'Vorherige' : 'Previous',
  };
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const { sortOptions, statusOptions, formatOptions, seasonOptions, browse, sortBy, status: statusLabel, format: formatLabel, season: seasonLabel, yearLabel, page: pageLabel, nextPage, previousPage } = useTranslations();
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [format, setFormat] = useState('');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'POPULARITY_DESC');
  const [season, setSeason] = useState(searchParams.get('season') ?? '');
  const [year, setYear] = useState(searchParams.get('year') ?? '');

  const fetchAnime = useCallback(async (pageNum: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', pageNum.toString());
    params.set('perPage', '20');
    params.set('sort', sort);
    if (status) params.set('status', status);
    if (format) params.set('format', format);
    if (season) params.set('season', season);
    if (year) params.set('year', year);
    selectedGenres.forEach(g => params.append('genre', g));

    try {
      const res = await fetch(`/api/anilist/browse?${params}`);
      const data = await res.json();
      setAnime(data.results ?? []);
      setHasNextPage(data.hasNextPage ?? false);
    } catch {
      setAnime([]);
    } finally {
      setLoading(false);
    }
  }, [sort, status, format, season, year, selectedGenres]);

  useEffect(() => { fetchAnime(page); }, [fetchAnime, page]);

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">{browse}</h1>

      <div className="space-y-4 mb-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Genres</h3>
          <GenreFilter selectedGenres={selectedGenres} onToggle={handleGenreToggle} />
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm font-semibold text-gray-400 block mb-1">{statusLabel}</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-400 block mb-1">{formatLabel}</label>
            <select
              value={format}
              onChange={(e) => { setFormat(e.target.value); setPage(1); }}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            >
              {formatOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-400 block mb-1">{seasonLabel}</label>
            <select
              value={season}
              onChange={(e) => { setSeason(e.target.value); setPage(1); }}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            >
              {seasonOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-400 block mb-1">{yearLabel}</label>
            <input
              type="number"
              value={year}
              onChange={(e) => { setYear(e.target.value); setPage(1); }}
              placeholder="2026"
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm w-24"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-400 block mb-1">{sortBy}</label>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={20} />
      ) : anime.length > 0 ? (
        <>
          <AnimeGrid anime={anime} />
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 focus-visible:bg-gray-700 transition"
            >
              {previousPage}
            </button>
            <span className="px-4 py-2 text-gray-400">{pageLabel} {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNextPage}
              className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 focus-visible:bg-gray-700 transition"
            >
              {nextPage}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p>{loading ? 'Lädt...' : 'Keine Ergebnisse gefunden'}</p>
        </div>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-gray-400">Loading...</div>}>
      <BrowseContent />
    </Suspense>
  );
}