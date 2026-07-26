'use client';

import { useState, useEffect, useRef } from 'react';
import HorizontalAnimeSection from '@/components/HorizontalAnimeSection';
import type { AnimeBasic } from '@/types';

interface Props {
  title: string;
  anime: AnimeBasic[];
  loading?: boolean;
  href?: string;
}

const posterCache = new Map<number, string>();

export default function PosterSection({ title, anime, loading, href }: Props) {
  const [posters, setPosters] = useState<Map<number, string>>(new Map());
  const fetchedIds = useRef(new Set<number>());

  useEffect(() => {
    if (anime.length === 0) return;
    const uncached = anime.filter(a => !fetchedIds.current.has(a.id) && !posterCache.has(a.id));
    if (uncached.length === 0) {
      const merged = new Map<number, string>();
      for (const a of anime) {
        const p = posterCache.get(a.id);
        if (p) merged.set(a.id, p);
      }
      setPosters(merged);
      return;
    }

    uncached.forEach(a => fetchedIds.current.add(a.id));
    const items = uncached.map(a => ({
      id: a.id,
      title: a.title.english || a.title.romaji,
      year: a.year,
    }));

    fetch(`/api/imdb/posters?items=${encodeURIComponent(JSON.stringify(items))}`)
      .then(r => r.json())
      .then(data => {
        const newPosters = data.posters ?? {};
        for (const [id, url] of Object.entries(newPosters)) {
          posterCache.set(parseInt(id), url as string);
        }
        const merged = new Map<number, string>();
        for (const a of anime) {
          const p = posterCache.get(a.id);
          if (p) merged.set(a.id, p);
        }
        setPosters(merged);
      })
      .catch(() => {});
  }, [anime]);

  return <HorizontalAnimeSection title={title} anime={anime} loading={loading} href={href} posters={posters} />;
}
