'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toSlug } from '@/lib/slug';
import { useLanguage } from '@/hooks/useLanguage';
import CoverImage from './CoverImage';

interface Recommendation {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string; medium: string; color?: string | null };
  averageScore: number | null;
  episodes: number | null;
  year: number | null;
}

interface RecommendationsRowProps {
  animeId: number;
}

export default function RecommendationsRow({ animeId }: RecommendationsRowProps) {
  const { language } = useLanguage();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/anilist/recommendations?id=${animeId}`)
      .then(r => r.json())
      .then(data => { setItems(data.results ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [animeId]);

  if (loading || items.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-white mb-4">
        {language === 'de' ? 'Empfehlungen' : 'Recommendations'}
      </h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {items.map((item) => {
          const title = item.title.english ?? item.title.romaji;
          return (
            <Link
              key={item.id}
              href={`/anime/${toSlug(title)}?id=${item.id}`}
              className="flex-shrink-0 w-36 group"
            >
              <div className="relative aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden ring-1 ring-white/[0.04] transition-all duration-300 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 group-hover:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)] group-focus-visible:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)]">
                <CoverImage
                  src={item.coverImage.large || item.coverImage.medium}
                  alt={title}
                  color={item.coverImage.color}
                  sizes="144px"
                  className="w-full h-full object-cover group-hover:scale-105 group-focus-visible:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-xs text-gray-300 mt-1 truncate group-hover:text-theme-primary group-focus-visible:text-theme-primary transition">
                {title}
              </p>
              <p className="text-[10px] text-gray-500">
                {item.averageScore && `${Math.round(item.averageScore / 10)}/10`}
                {item.averageScore && item.year ? ' • ' : ''}
                {item.year}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
