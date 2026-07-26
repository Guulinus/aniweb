'use client';
import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import MovieGrid from '@/components/MovieGrid';
import Link from 'next/link';

interface Movie {
  title: string;
  slug: string;
  posterImage: string;
  year?: number | null;
}

export default function FilmBrowsePage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/filmpalast/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
      <div className="mb-8">
        <Link href="/filme" className="text-theme-primary hover:text-theme-hover text-sm mb-4 inline-block">
          ← Zurück zu Filmen
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">Filme durchsuchen</h1>

        <form onSubmit={(e) => { e.preventDefault(); search(query); }} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Film suchen..."
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-theme-primary"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-theme-primary hover:bg-theme-hover text-white rounded-lg font-medium transition"
          >
            Suchen
          </button>
        </form>
      </div>

      <MovieGrid movies={results} loading={loading} />

      {!searched && !loading && (
        <div className="text-center py-12 text-gray-400">
          <p>Suche nach deinen Lieblingsfilmen</p>
        </div>
      )}
    </div>
  );
}
