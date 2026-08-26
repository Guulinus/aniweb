'use client';
import Link from 'next/link';
import type { AnimeBasic } from '@/types';
import CoverImage from './CoverImage';

interface MediaCardProps {
  anime: AnimeBasic;
  coverUrl?: string;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
}

export default function MediaCard({ anime, coverUrl, onMouseEnter, onMouseLeave }: MediaCardProps) {
  const title = anime.title.english ?? anime.title.romaji;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const eps = anime.episodes ?? null;
  const imgSrc = coverUrl || anime.coverImage.large || anime.coverImage.medium;

  return (
    <Link
      href={`/anime/${slug}?id=${anime.id}`}
      className="flex-shrink-0 w-[180px] group block"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="relative overflow-hidden rounded-xl bg-gray-800 aspect-[2/3] ring-1 ring-white/[0.04] transition-all duration-300 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 group-hover:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)] group-focus-visible:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)]">
        <CoverImage
          src={imgSrc}
          alt={title}
          color={anime.coverImage.color}
          sizes="(max-width: 640px) 33vw, 180px"
          className="w-full h-full object-cover group-hover:scale-110 group-focus-visible:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300" />
        {eps && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-theme-primary rounded text-xs font-semibold text-white flex items-center leading-none">
            {eps} EP
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-white truncate group-hover:text-theme-primary group-focus-visible:text-theme-primary transition font-medium">
        {title}
      </p>
      {anime.year && (
        <p className="text-xs text-gray-500 mt-0.5">{anime.year}</p>
      )}
    </Link>
  );
}
