'use client';
import Link from 'next/link';
import CoverImage from './CoverImage';

interface FilmCardProps {
  title: string;
  slug: string;
  posterImage: string;
  year?: number | null;
}

export default function FilmCard({ title, slug, posterImage, year }: FilmCardProps) {
  return (
    <Link href={`/filme/${slug}`} className="flex-shrink-0 w-[180px] group block">
      <div className="relative overflow-hidden rounded-xl bg-gray-800 aspect-[2/3] ring-1 ring-white/[0.04] opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 group-hover:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)] group-focus-visible:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)]">
        <CoverImage
          src={posterImage}
          alt={title}
          sizes="(max-width: 640px) 33vw, 180px"
          className="w-full h-full object-cover group-hover:scale-110 group-focus-visible:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300" />
      </div>
      <p className="mt-2 text-sm text-white truncate group-hover:text-theme-primary group-focus-visible:text-theme-primary transition font-medium">
        {title}
      </p>
      {year && (
        <p className="text-xs text-gray-500 mt-0.5">{year}</p>
      )}
    </Link>
  );
}
