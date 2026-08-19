'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import AnimeGrid from '@/components/AnimeGrid';
import type { AnimeBasic } from '@/types';
import { useState, useEffect, useRef } from 'react';

const getSortOptions = (lang: string) => [
  { value: 'POPULARITY_DESC', label: lang === 'de' ? 'Beliebt' : 'Most Popular' },
  { value: 'TRENDING_DESC', label: lang === 'de' ? 'Trend' : 'Trending' },
  { value: 'SCORE_DESC', label: lang === 'de' ? 'Beste Bewertung' : 'Highest Score' },
  { value: 'TITLE_ROMAJI', label: lang === 'de' ? 'Titel A-Z' : 'Title A-Z' },
];

function SearchContent() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [sort, setSort] = useState('POPULARITY_DESC');
  const inputRef = useRef<HTMLInputElement>(null);
  const sortOptions = getSortOptions(language);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
    setPage(1);
  }, [initialQuery]);

  useEffect(() => {
    if (!query) { setResults([]); setLoading(false); return; }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/anilist/search?q=${encodeURIComponent(query)}&page=${page}&perPage=20&sort=${sort}`)
        .then(r => r.json())
        .then(d => { setResults(d.results ?? []); setHasNextPage(d.hasNextPage ?? false); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, page, sort]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-xl">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder={language === 'de' ? 'Anime suchen...' : 'Search anime...'}
            autoComplete="off"
            enterKeyHint="search"
            className="w-full pl-11 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/30 transition"
          />
        </div>
      </form>

      <div className="flex items-center gap-4 mb-6">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer pr-8"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
        >
          {sortOptions.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {query && !loading && <span className="text-gray-400 text-sm">{results.length} {language === 'de' ? 'Ergebnisse' : 'results'}</span>}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-800 aspect-[2/3] animate-pulse" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <>
          <AnimeGrid anime={results} />
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 focus-visible:bg-gray-700 transition"
            >
              {language === 'de' ? 'Zurück' : 'Previous'}
            </button>
            <span className="px-4 py-2 text-gray-400 text-sm">{language === 'de' ? 'Seite' : 'Page'} {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNextPage}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 focus-visible:bg-gray-700 transition"
            >
              {language === 'de' ? 'Weiter' : 'Next'}
            </button>
          </div>
        </>
      ) : query ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-400 text-lg mb-2">{language === 'de' ? 'Keine Ergebnisse gefunden' : 'No results found'}</p>
          <p className="text-gray-500 text-sm">{language === 'de' ? 'Versuche einen anderen Suchbegriff' : 'Try a different search term'}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-10 bg-gray-800 rounded-xl max-w-xl mb-6 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-gray-800 aspect-[2/3] animate-pulse" />
        ))}
      </div>
    </div>}>
      <SearchContent />
    </Suspense>
  );
}
