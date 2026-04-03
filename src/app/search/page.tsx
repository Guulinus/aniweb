'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AnimeGrid from '@/components/AnimeGrid';
import type { AnimeBasic } from '@/types';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [results, setResults] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    if (!query) { setResults([]); setLoading(false); return; }

    setLoading(true);
    fetch(`/api/anilist/search?q=${encodeURIComponent(query)}&page=${page}&perPage=20`)
      .then(r => r.json())
      .then(d => { setResults(d.results ?? []); setHasNextPage(d.hasNextPage ?? false); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [query, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">
        {query ? `Search results for "${query}"` : 'Search'}
      </h1>
      {query && <p className="text-gray-400 mb-6">{results.length} results found</p>}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Searching...</div>
      ) : results.length > 0 ? (
        <>
          <AnimeGrid anime={results} />
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
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No results found</p>
          <p className="text-sm mt-2">Try a different search term</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-gray-400">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
