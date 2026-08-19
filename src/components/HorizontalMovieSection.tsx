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
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftFade(scrollLeft > 0);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
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
        <div className="flex gap-4 overflow-hidden py-2">
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
    <section className="mb-14 relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-theme-primary rounded-full flex-shrink-0" />
          <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="text-sm text-gray-400 hover:text-theme-primary transition flex items-center gap-1">
            Alle anzeigen <span className="text-lg leading-none">→</span>
          </Link>
        )}
      </div>

      <div className="relative">
        {showLeftFade && (
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
        )}
        {showLeftFade && (
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
            className="absolute left-2 top-[calc(50%-2rem)] -translate-y-1/2 z-20 w-10 h-10 bg-gray-900/80 hover:bg-gray-700 rounded-full flex items-center justify-center text-white shadow-lg border border-gray-700/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', overflowY: 'hidden' }}
        >
          {movies.map((movie) => (
            <FilmCard key={movie.slug} {...movie} />
          ))}
        </div>

        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
        )}
        {showRightFade && (
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            className="absolute right-2 top-[calc(50%-2rem)] -translate-y-1/2 z-20 w-10 h-10 bg-gray-900/80 hover:bg-gray-700 rounded-full flex items-center justify-center text-white shadow-lg border border-gray-700/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>
    </section>
  );
});

export default HorizontalMovieSection;
