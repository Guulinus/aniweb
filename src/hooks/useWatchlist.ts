'use client';

import { useState, useCallback, useEffect } from 'react';
import type { WatchlistStatus, WatchlistEntry } from '@/types';

const STORAGE_KEY = 'watchlist';

function getWatchlist(): WatchlistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function setWatchlist(entries: WatchlistEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    setEntries(getWatchlist());

    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setEntries(getWatchlist());
      }
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const add = useCallback((entry: Omit<WatchlistEntry, 'addedAt'>) => {
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.animeId !== entry.animeId);
      const updated = [{ ...entry, addedAt: Date.now() }, ...filtered];
      try {
        setWatchlist(updated);
      } catch {
        // localStorage full
      }
      return updated;
    });
  }, []);

  const remove = useCallback((animeId: number) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.animeId !== animeId);
      try {
        setWatchlist(updated);
      } catch {
        // localStorage full
      }
      return updated;
    });
  }, []);

  const updateStatus = useCallback((animeId: number, status: WatchlistStatus) => {
    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.animeId === animeId ? { ...e, status } : e
      );
      try {
        setWatchlist(updated);
      } catch {
        // localStorage full
      }
      return updated;
    });
  }, []);

  const updateProgress = useCallback((animeId: number, currentEpisode: number) => {
    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.animeId === animeId ? { ...e, currentEpisode } : e
      );
      try {
        setWatchlist(updated);
      } catch {
        // localStorage full
      }
      return updated;
    });
  }, []);

  const isInWatchlist = useCallback(
    (animeId: number) => entries.some((e) => e.animeId === animeId),
    [entries]
  );

  const getEntry = useCallback(
    (animeId: number) => entries.find((e) => e.animeId === animeId) ?? null,
    [entries]
  );

  return {
    entries,
    add,
    remove,
    updateStatus,
    updateProgress,
    isInWatchlist,
    getEntry,
  };
}
