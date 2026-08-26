import Link from 'next/link';
import type { AnimeBasic } from '@/types';
import { toSlug } from '@/lib/slug';
import CoverImage from './CoverImage';

interface AnimeCardProps {
  anime: AnimeBasic;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const title = anime.title.english ?? anime.title.romaji;
  const slug = toSlug(title);

  return (
    <Link href={`/anime/${slug}?id=${anime.id}`} className="group block">
      <div className="relative overflow-hidden rounded-lg bg-gray-800 aspect-[3/4] ring-1 ring-white/[0.04] transition-all duration-300 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 group-hover:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)] group-focus-visible:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)]">
        <CoverImage
          src={anime.coverImage.large || anime.coverImage.medium}
          alt={title}
          color={anime.coverImage.color}
          sizes="(max-width: 640px) 33vw, 180px"
          className="w-full h-full object-cover group-hover:scale-105 group-focus-visible:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
      </div>
      <h3 className="mt-2 text-sm text-white truncate group-hover:text-theme-primary group-focus-visible:text-theme-primary transition">
        {title}
      </h3>
      {anime.year && (
        <p className="text-xs text-gray-500">{anime.year}</p>
      )}
    </Link>
  );
}