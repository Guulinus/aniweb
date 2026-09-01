'use client';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MovieGrid from '@/components/MovieGrid';
import Link from 'next/link';

interface Movie {
  title: string;
  slug: string;
  posterImage: string;
  year?: number | null;
}

const GENRES = [
  { value: 'action', label: 'Action' },
  { value: 'comedy', label: 'Komödie' },
  { value: 'family', label: 'Familie' },
  { value: 'adventure', label: 'Abenteuer' },
  { value: 'scifi', label: 'Sci-Fi' },
  { value: 'drama', label: 'Drama' },
  { value: 'Fantasy', label: 'Fantasy' },
  { value: 'Krimi', label: 'Krimi' },
  { value: 'Romantik', label: 'Romantik' },
  { value: 'Animation', label: 'Animation' },
];

function FilmBrowseContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeGenre, setActiveGenre] = useState(initialCategory);
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setActiveGenre('');
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

  const browseGenre = useCallback(async (genre: string) => {
    setQuery('');
    setActiveGenre(genre);
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/filmpalast/categories?category=${encodeURIComponent(genre)}`);
      const data = await res.json();
      setResults(data.movies ?? []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  const initialQuery = searchParams.get('q') || '';

  useEffect(() => {
    if (initialCategory) browseGenre(initialCategory);
    else if (initialQuery) search(initialQuery);
    // Only meant to run once for whatever the URL was loaded with — `search`/`browseGenre`
    // are stable (empty-dep useCallback), so this intentionally isn't re-run on their identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory, initialQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
      <div className="mb-8">
        <Link href="/filme" className="text-theme-primary hover:text-theme-hover text-sm mb-4 inline-block">
          ← Zurück zu Filmen
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">Filme durchsuchen</h1>

        <form onSubmit={(e) => { e.preventDefault(); search(query); }} className="flex gap-3 mb-6">
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

        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g.value}
              onClick={() => browseGenre(g.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeGenre === g.value
                  ? 'bg-theme-primary text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {searched || loading ? (
        <MovieGrid movies={results} loading={loading} />
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p>Suche nach deinen Lieblingsfilmen oder wähle ein Genre</p>
        </div>
      )}
    </div>
  );
}

export default function FilmBrowsePage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
      <div className="h-8 bg-gray-800 rounded w-64 mb-6 animate-pulse" />
      <div className="h-12 bg-gray-800 rounded-lg mb-6 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-gray-800 aspect-[2/3] animate-pulse" />
        ))}
      </div>
    </div>}>
      <FilmBrowseContent />
    </Suspense>
  );
}
