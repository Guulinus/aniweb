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
      <div className="relative overflow-hidden rounded-xl bg-gray-800 aspect-[2/3] ring-1 ring-white/[0.04] group-hover:ring-white/[0.08] group-focus-visible:ring-white/[0.08] transition-all duration-300 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 group-hover:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)] group-focus-visible:shadow-[0_18px_38px_-12px_var(--color-primary-shadow)]">
        <CoverImage
          src={posterImage}
          alt={title}
          sizes="(max-width: 640px) 33vw, 180px"
          className="w-full h-full object-cover group-hover:scale-105 group-focus-visible:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300" />

        {year && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-xs font-semibold text-white/90 flex items-center leading-none">
            {year}
          </div>
        )}
      </div>
      <p className="mt-2 text-[13px] text-white truncate group-hover:text-theme-primary group-focus-visible:text-theme-primary transition font-medium">
        {title}
      </p>
    </Link>
  );
}
