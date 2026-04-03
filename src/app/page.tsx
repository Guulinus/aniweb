'use client';

import { useState, useEffect } from 'react';
import AnimeGrid from '@/components/AnimeGrid';
import type { AnimeBasic } from '@/types';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Trending</h2>
        <TrendingSection />
      </section>
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Popular</h2>
        <PopularSection />
      </section>
    </div>
  );
}

function TrendingSection() {
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/anilist/trending?perPage=12')
      .then(r => r.json())
      .then(d => { setAnime(d.results ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading...</div>;
  return <AnimeGrid anime={anime} />;
}

function PopularSection() {
  const [anime, setAnime] = useState<AnimeBasic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/anilist/popular?perPage=12')
      .then(r => r.json())
      .then(d => { setAnime(d.results ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading...</div>;
  return <AnimeGrid anime={anime} />;
}
