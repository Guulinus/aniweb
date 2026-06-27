'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AnimeGrid from '@/components/AnimeGrid';
import { SkeletonGrid } from '@/components/Skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import type { AnimeBasic } from '@/types';

function getCurrentSeason(): { season: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month <= 3) return { season: 'WINTER', year };
  if (month <= 6) return { season: 'SPRING', year };
  if (month <= 9) return { season: 'SUMMER', year };
  return { season: 'FALL', year };
}

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

function SeasonalContent() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = getCurrentSeason();
  const [season, setSeason] = useState(searchParams.get('season')?.toUpperCase() || current.season);
  const [year, setYear] = useState(parseInt(searchParams.get('year') || String(current.year)));
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ season, year: String(year), sort: 'POPULARITY_DESC', perPage: '20', page: String(page) });
    fetch(`/api/anilist/browse?${params}`)
      .then(r => r.json())
      .then(data => {
        setAnime(data.results ?? []);
        setHasNextPage(data.hasNextPage ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [season, year, page]);

  const handleSeasonChange = (s: string) => {
    setSeason(s);
    setPage(1);
    router.replace(`/seasonal?season=${s}&year=${year}`, { scroll: false });
  };

  const handleYearChange = (y: number) => {
    setYear(y);
    setPage(1);
    router.replace(`/seasonal?season=${season}&year=${y}`, { scroll: false });
  };

  const seasonNames: Record<string, string> = {
    WINTER: language === 'de' ? 'Winter' : 'Winter',
    SPRING: language === 'de' ? 'Frühling' : 'Spring',
    SUMMER: language === 'de' ? 'Sommer' : 'Summer',
    FALL: language === 'de' ? 'Herbst' : 'Fall',
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">
        {language === 'de' ? 'Saisonale Übersicht' : 'Seasonal Anime'}
      </h1>

      <div className="flex flex-wrap gap-3 mb-8">
        {SEASONS.map(s => (
          <button
            key={s}
            onClick={() => handleSeasonChange(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              season === s
                ? 'bg-theme-primary text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 focus-visible:text-white focus-visible:bg-gray-700'
            }`}
          >
            {seasonNames[s]}
          </button>
        ))}
        <select
          value={year}
          onChange={(e) => handleYearChange(parseInt(e.target.value))}
          className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm ml-2"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
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
              {language === 'de' ? 'Vorherige' : 'Previous'}
            </button>
            <span className="px-4 py-2 text-gray-400">{language === 'de' ? 'Seite' : 'Page'} {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNextPage}
              className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 focus-visible:bg-gray-700 transition"
            >
              {language === 'de' ? 'Nächste' : 'Next'}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p>{language === 'de' ? 'Keine Ergebnisse gefunden' : 'No results found'}</p>
        </div>
      )}
    </div>
  );
}

export default function SeasonalPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-gray-400">Loading...</div>}>
      <SeasonalContent />
    </Suspense>
  );
}
