'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

interface GenreFilterProps {
  selectedGenres: string[];
  onToggle: (genre: string) => void;
}

export default function GenreFilter({ selectedGenres, onToggle }: GenreFilterProps) {
  const { language } = useLanguage();
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/anilist/genres')
      .then(r => r.json())
      .then(d => { setGenres(d.genres ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">{language === 'de' ? 'Genres werden geladen...' : 'Loading genres...'}</div>;

  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => (
        <button
          key={genre}
          onClick={() => onToggle(genre)}
          className={`px-3 py-1 text-sm rounded-full border transition ${
            selectedGenres.includes(genre)
              ? 'bg-purple-600 border-purple-500 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
          }`}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}
