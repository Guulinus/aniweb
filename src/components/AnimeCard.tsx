import Link from 'next/link';
import type { AnimeBasic } from '@/types';
import { toSlug } from '@/lib/slug';

interface AnimeCardProps {
  anime: AnimeBasic;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const title = anime.title.english ?? anime.title.romaji;
  const slug = toSlug(title);

  return (
    <Link
      href={`/anime/${slug}?id=${anime.id}`}
      className="group block"
    >
      <div className="relative overflow-hidden rounded-lg bg-gray-800 aspect-[3/4]">
        <img
          src={anime.coverImage.large || anime.coverImage.medium}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {anime.averageScore && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {anime.averageScore}%
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="mt-2 text-sm text-white truncate group-hover:text-purple-400 transition">
        {title}
      </h3>
      {anime.year && (
        <p className="text-xs text-gray-500">{anime.year}</p>
      )}
    </Link>
  );
}
