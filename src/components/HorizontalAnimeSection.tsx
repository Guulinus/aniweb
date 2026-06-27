'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import type { AnimeBasic } from '@/types';

interface HorizontalAnimeSectionProps {
  title: string;
  anime: AnimeBasic[];
  loading?: boolean;
  href?: string;
}

export default function HorizontalAnimeSection({ title, anime, loading, href }: HorizontalAnimeSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const [preview, setPreview] = useState<{
    anime: AnimeBasic;
    cardRect: DOMRect;
  } | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const handleMouseEnter = (item: AnimeBasic, e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const timeout = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      setPreview({ anime: item, cardRect: rect });
    }, 1000);
    (target as any).__hoverTimeout = timeout;
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    const timeout = (e.currentTarget as any).__hoverTimeout;
    if (timeout) clearTimeout(timeout);
    setPreview(null);
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftFade(scrollLeft > 0);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    return () => {
      const allTimeouts = document.querySelectorAll('[data-hover-timeout]');
      allTimeouts.forEach((el: any) => {
        if (el.__hoverTimeout) clearTimeout(el.__hoverTimeout);
      });
    };
  }, []);

  useEffect(() => {
    if (preview && !previewVisible) {
      const timer = setTimeout(() => setPreviewVisible(true), 10);
      return () => clearTimeout(timer);
    }
    if (!preview && previewVisible) {
      const timer = setTimeout(() => setPreviewVisible(false), 10);
      return () => clearTimeout(timer);
    }
  }, [preview]);

  if (loading) {
    return (
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-theme-primary rounded-full" />
          <div className="h-7 w-48 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden py-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44">
              <div className="aspect-[3/4] bg-gray-800 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (anime.length === 0) return null;

  const previewTitle = preview?.anime.title.english ?? preview?.anime.title.romaji ?? '';
  const previewImage = preview?.anime.bannerImage || preview?.anime.coverImage.large || preview?.anime.coverImage.medium || '';
  const previewScore = preview?.anime.averageScore ? `${(preview.anime.averageScore / 10).toFixed(1)}` : null;
  const previewEps = preview?.anime.episodes ?? null;
  const previewGenres = preview?.anime.genres?.slice(0, 3) ?? [];
  const previewFormat = preview?.anime.format ?? '';

  const previewStyle = preview ? (() => {
    const PREVIEW_WIDTH = 288;
    const GAP = 16;
    const spaceOnRight = window.innerWidth - preview.cardRect.right;
    const left = spaceOnRight >= PREVIEW_WIDTH + GAP
      ? preview.cardRect.right + GAP
      : preview.cardRect.left - GAP - PREVIEW_WIDTH;
    return { left, top: Math.max(0, Math.min(preview.cardRect.top, window.innerHeight - 240)) };
  })() : {};

  return (
    <section className="mb-14 relative">
      <div className="flex items-center justify-between mb-6 group">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-theme-primary rounded-full flex-shrink-0" />
          <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition flex items-center gap-1">
            {title.toLowerCase().includes('season') || title.toLowerCase().includes('winter') || title.toLowerCase().includes('spring') || title.toLowerCase().includes('summer') || title.toLowerCase().includes('fall') ? 'Mehr' : 'Alle anzeigen'}
            <span className="text-lg leading-none">→</span>
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
            className="absolute left-2 top-[calc(50%-2rem)] -translate-y-1/2 z-20 w-10 h-10 bg-gray-900/80 hover:bg-gray-700 focus-visible:bg-gray-700 rounded-full flex items-center justify-center text-white transition shadow-lg border border-gray-700/50"
            aria-label="Scroll left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
            if (e.key === 'ArrowRight') scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
          }}
          className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-2 focus:outline-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {anime.map((item) => {
            const itemTitle = item.title.english ?? item.title.romaji;
            const slug = itemTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const score = item.averageScore ? (item.averageScore / 10).toFixed(1) : null;
            const eps = item.episodes ?? null;

            return (
              <Link
                key={item.id}
                href={`/anime/${slug}?id=${item.id}`}
                className="flex-shrink-0 w-44 group block"
                onMouseEnter={(e) => handleMouseEnter(item, e)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="relative overflow-hidden rounded-lg bg-gray-800 aspect-[3/4] shadow-lg">
                  <img
                    src={item.coverImage.large || item.coverImage.medium}
                    alt={itemTitle}
                    className="w-full h-full object-cover group-hover:scale-110 group-focus-visible:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300" />

                  {/* Episodes badge */}
                  {eps && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-theme-primary rounded text-xs font-semibold text-white">
                      {eps} EP
                    </div>
                  )}

                  {/* Bottom info on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-transform duration-300" />
                </div>
                <p className="mt-2 text-sm text-white truncate group-hover:text-theme-primary group-focus-visible:text-theme-primary transition font-medium">
                  {itemTitle}
                </p>
                {item.year && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.year}</p>
                )}
              </Link>
            );
          })}
        </div>

        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
        )}

        {showRightFade && (
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            className="absolute right-2 top-[calc(50%-2rem)] -translate-y-1/2 z-20 w-10 h-10 bg-gray-900/80 hover:bg-gray-700 focus-visible:bg-gray-700 rounded-full flex items-center justify-center text-white transition shadow-lg border border-gray-700/50"
            aria-label="Scroll right"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>

      {/* Preview popup */}
      {(preview || previewVisible) && (
        <div
          className={`fixed bg-gray-900 rounded-lg overflow-hidden shadow-2xl w-72 z-50 pointer-events-none transition-opacity duration-200 border border-gray-700/50 ${previewVisible ? 'opacity-100' : 'opacity-0'}`}
          style={previewVisible ? previewStyle : {}}
        >
          {preview && previewImage && (
            <div className="relative h-36">
              <img src={previewImage} alt={previewTitle} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
            </div>
          )}
          {preview && (
            <div className="p-3 -mt-8 relative z-10">
              <h3 className="font-bold text-white text-sm mb-2 line-clamp-2">{previewTitle}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                {previewScore && <span className="text-yellow-400">⭐ {previewScore}</span>}
                {previewEps && <span>📺 {previewEps} EP</span>}
                {previewFormat && <span className="uppercase">{previewFormat}</span>}
              </div>
              {previewGenres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {previewGenres.map(g => (
                    <span key={g} className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400">{g}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
