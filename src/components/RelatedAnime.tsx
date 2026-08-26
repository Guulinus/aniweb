'use client';

import Link from 'next/link';
import { toSlug } from '@/lib/slug';
import { useLanguage } from '@/hooks/useLanguage';
import CoverImage from './CoverImage';

interface Relation {
  relationType: string;
  node: {
    id: number;
    title: { romaji: string; english: string | null };
    format?: string;
    episodes?: number | null;
    coverImage?: { extraLarge?: string; large?: string; medium?: string; color?: string | null };
    bannerImage?: string | null;
    startDate?: { year?: number | null } | null;
  };
}

interface RelatedAnimeProps {
  relations: { edges: Relation[] };
}

const LABEL_MAP: Record<string, string> = {
  PREQUEL: 'Prequel',
  SEQUEL: 'Sequel',
  SIDE_STORY: 'Side Story',
  SPIN_OFF: 'Spin-off',
  ADAPTATION: 'Adaptation',
  CHARACTER: 'Character',
  SUMMARY: 'Summary',
};

const RELEVANT_TYPES = new Set(['PREQUEL', 'SEQUEL', 'SIDE_STORY', 'SPIN_OFF', 'ADAPTATION', 'CHARACTER', 'SUMMARY']);

export default function RelatedAnime({ relations }: RelatedAnimeProps) {
  const { language } = useLanguage();
  const edges = relations.edges?.filter(e => RELEVANT_TYPES.has(e.relationType) && e.node.coverImage) ?? [];
  if (edges.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-white mb-4">
        {language === 'de' ? 'Verwandte Anime' : 'Related Anime'}
      </h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {edges.map((edge, i) => {
          const title = edge.node.title.english ?? edge.node.title.romaji;
          const slug = toSlug(title);
          const label = LABEL_MAP[edge.relationType] || edge.relationType;
          const cover = edge.node.coverImage!;
          return (
            <Link
              key={`${edge.node.id}-${i}`}
              href={`/anime/${slug}?id=${edge.node.id}`}
              className="flex-shrink-0 w-36 group"
            >
              <div className="relative aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden ring-1 ring-white/[0.04] transition-all duration-300 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 group-hover:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)] group-focus-visible:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)]">
                <CoverImage
                  src={cover.extraLarge || cover.large || cover.medium || ''}
                  alt={title}
                  color={cover.color}
                  sizes="144px"
                  className="w-full h-full object-cover group-hover:scale-105 group-focus-visible:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white bg-theme-primary/90 backdrop-blur-sm rounded">
                  {label}
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1 truncate group-hover:text-theme-primary group-focus-visible:text-theme-primary transition">
                {title}
              </p>
              <p className="text-[10px] text-gray-500">
                {edge.node.format}
                {edge.node.format && edge.node.startDate?.year ? ' • ' : ''}
                {edge.node.startDate?.year}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
