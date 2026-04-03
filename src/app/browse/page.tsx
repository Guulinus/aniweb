'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AnimeGrid from '@/components/AnimeGrid';
import GenreFilter from '@/components/GenreFilter';
import type { AnimeBasic } from '@/types';

const SORT_OPTIONS = [
  { value: 'POPULARITY_DESC', label: 'Most Popular' },
  { value: 'SCORE_DESC', label: 'Highest Score' },
  { value: 'TRENDING_DESC', label: 'Trending' },
  { value: 'FAVOURITES_DESC', label: 'Most Favorites' },
  { value: 'TITLE_ROMAJI', label: 'Title A-Z' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'RELEASING', label: 'Airing' },
  { value: 'FINISHED', label: 'Finished' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
];

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'POPULARITY_DESC');

  const fetchAnime = useCallback(async (pageNum: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', pageNum.toString());
    params.set('perPage', '20');
    params.set('sort', sort);
    if (status) params.set('status', status);
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
  }, [sort, status, selectedGenres]);

  useEffect(() => { fetchAnime(page); }, [fetchAnime, page]);

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
    setPage(1);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(1);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Browse Anime</h1>

      <div className="space-y-4 mb-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Genres</h3>
          <GenreFilter selectedGenres={selectedGenres} onToggle={handleGenreToggle} />
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-400 block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-400 block mb-1">Sort By</label>
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <>
          <AnimeGrid anime={anime} />
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-400">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNextPage}
              className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition"
            >
              Next
            </button>
          </div>
        </>
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
