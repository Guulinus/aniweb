'use client';
import { useState, useEffect, useRef } from 'react';

const cache = new Map<string, { data: any; timestamp: number }>();
const inflight = new Map<string, Promise<any>>();
const CACHE_TTL = 5 * 60 * 1000;

export function useFetch<T>(url: string | null, options?: { cacheTime?: number }): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!url) { setLoading(false); return; }

    const ttl = options?.cacheTime ?? CACHE_TTL;
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < ttl) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let fetchPromise: Promise<T>;
    if (inflight.has(url)) {
      fetchPromise = inflight.get(url)!;
    } else {
      fetchPromise = fetch(url).then(r => r.json()).then(d => {
        cache.set(url, { data: d, timestamp: Date.now() });
        inflight.delete(url);
        return d;
      });
      inflight.set(url, fetchPromise);
    }

    fetchPromise
      .then(d => { if (mountedRef.current) { setData(d); setLoading(false); } })
      .catch(e => { if (mountedRef.current) { setError(e); setLoading(false); } });
  }, [url]);

  return { data, loading, error };
}
