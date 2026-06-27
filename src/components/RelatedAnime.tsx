'use client';

import Link from 'next/link';
import { toSlug } from '@/lib/slug';
import { useLanguage } from '@/hooks/useLanguage';

interface Relation {
  relationType: string;
  node: {
    id: number;
    title: { romaji: string; english: string | null };
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
  const edges = relations.edges?.filter(e => RELEVANT_TYPES.has(e.relationType)) ?? [];
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
          return (
            <Link
              key={`${edge.node.id}-${i}`}
              href={`/anime/${slug}?id=${edge.node.id}`}
              className="flex-shrink-0 px-4 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 focus-visible:bg-gray-700 transition group"
            >
              <span className="text-xs font-medium text-theme-primary block">{label}</span>
              <span className="text-sm text-gray-300 group-hover:text-white group-focus-visible:text-white whitespace-nowrap">
                {title}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
