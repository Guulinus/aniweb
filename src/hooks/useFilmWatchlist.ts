'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'filmWatchlist';

export interface FilmWatchlistEntry {
  slug: string;
  title: string;
  posterImage: string;
  year?: number | null;
  addedAt: number;
}

function getFilmWatchlist(): FilmWatchlistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function setFilmWatchlist(entries: FilmWatchlistEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useFilmWatchlist() {
  const [entries, setEntries] = useState<FilmWatchlistEntry[]>([]);

  useEffect(() => {
    setEntries(getFilmWatchlist());

    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setEntries(getFilmWatchlist());
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const add = useCallback((entry: Omit<FilmWatchlistEntry, 'addedAt'>) => {
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.slug !== entry.slug);
      const updated = [{ ...entry, addedAt: Date.now() }, ...filtered];
      try { setFilmWatchlist(updated); } catch {}
      return updated;
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.slug !== slug);
      try { setFilmWatchlist(updated); } catch {}
      return updated;
    });
  }, []);

  const isInWatchlist = useCallback(
    (slug: string) => entries.some((e) => e.slug === slug),
    [entries]
  );

  return { entries, add, remove, isInWatchlist };
}
