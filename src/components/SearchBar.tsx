'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { AnimeBasic } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';

export default function SearchBar() {
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeBasic[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const saveSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const placeholderText = mounted ? (language === 'de' ? 'Anime suchen...' : 'Search anime...') : '';

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/anilist/search?q=${encodeURIComponent(query)}&perPage=5`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveSearch(query.trim());
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  const handleRecentClick = (search: string) => {
    setQuery(search);
    router.push(`/search?q=${encodeURIComponent(search)}`);
    setIsOpen(false);
  };

  if (!mounted) {
    return <div ref={containerRef} className="relative"><div className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700">&nbsp;</div></div>;
  }

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholderText}
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-theme-primary focus:outline-none placeholder-gray-500"
        />
      </form>

      {isOpen && query.length === 0 && recentSearches.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
            {language === 'de' ? 'Letzte Suchen' : 'Recent searches'}
          </div>
          {recentSearches.map((search, i) => (
            <button
              key={i}
              onClick={() => handleRecentClick(search)}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 focus-visible:bg-gray-700 transition text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white text-sm truncate">{search}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
          {results.map((anime) => (
            <button
              key={anime.id}
              onClick={() => {
                const title = anime.title.english ?? anime.title.romaji;
                router.push(`/anime/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}?id=${anime.id}`);
                saveSearch(title);
                setIsOpen(false);
                setQuery('');
              }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-700 focus-visible:bg-gray-700 transition text-left"
            >
              <img src={anime.coverImage.large || anime.coverImage.medium} alt="" className="w-10 h-14 object-cover rounded" loading="lazy" />
              <span className="text-white text-sm truncate">{anime.title.english ?? anime.title.romaji}</span>
            </button>
          ))}
          <button
            onClick={handleSubmit}
            className="w-full px-4 py-2 text-theme-primary text-sm hover:bg-gray-700 focus-visible:bg-gray-700 transition border-t border-gray-700"
          >
            {language === 'de' ? 'Alle Ergebnisse anzeigen' : 'View all results'}
          </button>
        </div>
      )}

      {isOpen && isLoading && (
        <div className="absolute top-full mt-2 w-full bg-gray-800 rounded-lg border border-gray-700 shadow-xl p-4 text-center text-gray-400">
          {language === 'de' ? 'Suchen...' : 'Searching...'}
        </div>
      )}
    </div>
  );
}
