'use client';
import { useRef, useState, useEffect, memo } from 'react';
import Link from 'next/link';
import FilmCard from './FilmCard';

interface Movie {
  title: string;
  slug: string;
  posterImage: string;
  year?: number | null;
}

interface Props {
  title: string;
  movies: Movie[];
  loading?: boolean;
  href?: string;
}

const HorizontalMovieSection = memo(function HorizontalMovieSection({ title, movies, loading, href }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [touchStart, setTouchStart] = useState(0);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => { handleScroll(); }, [movies]);

  if (loading) {
    return (
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-theme-primary rounded-full" />
          <div className="h-7 w-48 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden py-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[180px]">
              <div className="aspect-[2/3] bg-gray-800 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (movies.length === 0) return null;

  return (
    <section className="mb-14 relative group/section">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-theme-primary rounded-full flex-shrink-0" />
          <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition flex items-center gap-1 opacity-0 group-hover/section:opacity-100">
            Alle anzeigen
            <span className="text-lg leading-none">→</span>
          </Link>
        )}
      </div>

      <div className="relative group/row">
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const diff = touchStart - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
              scrollRef.current?.scrollBy({ left: diff > 0 ? 300 : -300, behavior: 'smooth' });
            }
          }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
            if (e.key === 'ArrowRight') scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
          }}
          className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-2 overscroll-behavior-x-contain focus:outline-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', overflowY: 'hidden' }}
        >
          {movies.map((movie) => (
            <FilmCard key={movie.slug} {...movie} />
          ))}
        </div>

        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
        )}

        {canScrollRight && (
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-[#16161f]/90 hover:bg-[#1f1f2e] focus-visible:bg-[#1f1f2e] rounded-full flex items-center justify-center text-white transition-all shadow-xl shadow-black/40 border border-white/[0.06] backdrop-blur-sm opacity-0 group-hover/row:opacity-100"
            aria-label="Scroll right"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>
    </section>
  );
});

export default HorizontalMovieSection;
