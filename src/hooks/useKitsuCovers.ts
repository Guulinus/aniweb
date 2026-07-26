'use client';
import { useState, useEffect, useRef } from 'react';

const CACHE_KEY = 'kitsuCovers';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function loadCache(): Map<number, { url: string | null; timestamp: number }> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return new Map();
    const entries = JSON.parse(raw);
    return new Map(entries.filter(([, v]: [any, any]) => Date.now() - v.timestamp < CACHE_TTL));
  } catch { return new Map(); }
}

function saveCache(map: Map<number, { url: string | null; timestamp: number }>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(map.entries()).slice(-500)));
  } catch {}
}

export function useKitsuCovers(animeIds: number[]) {
  const [covers, setCovers] = useState<Map<number, string>>(new Map());
  const cacheRef = useRef(loadCache());
  const fetchedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (animeIds.length === 0) return;

    const fromCache = new Map<number, string>();
    const uncached: number[] = [];
    for (const id of animeIds) {
      const entry = cacheRef.current.get(id);
      if (entry?.url) fromCache.set(id, entry.url);
      else if (!fetchedRef.current.has(id)) uncached.push(id);
    }

    if (fromCache.size > 0) setCovers(prev => {
      const merged = new Map(prev);
      fromCache.forEach((v, k) => merged.set(k, v));
      return merged;
    });

    if (uncached.length === 0) return;

    const fetchCovers = async () => {
      for (let i = 0; i < uncached.length; i += 4) {
        const batch = uncached.slice(i, i + 4);
        batch.forEach(id => fetchedRef.current.add(id));
        await Promise.all(batch.map(async id => {
          try {
            const res = await fetch(`/api/kitsu/covers?animeId=${id}`);
            const data = await res.json();
            const url = data.coverUrl ?? null;
            cacheRef.current.set(id, { url, timestamp: Date.now() });
            if (url) {
              setCovers(prev => {
                const next = new Map(prev);
                next.set(id, url);
                return next;
              });
            }
          } catch {}
        }));
      }
      saveCache(cacheRef.current);
    };
    fetchCovers();
  }, [animeIds.join(',')]);

  return covers;
}
