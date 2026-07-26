'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import type { AnimeBasic } from '@/types';

interface HorizontalAnimeSectionProps {
  title: string;
  anime: AnimeBasic[];
  loading?: boolean;
  href?: string;
  posters?: Map<number, string>;
}

export default function HorizontalAnimeSection({ title, anime, loading, href, posters }: HorizontalAnimeSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [canTouch, setCanTouch] = useState(false);
  const [touchStart, setTouchStart] = useState(0);

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
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    setCanTouch('ontouchstart' in window);
  }, []);

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

  if (anime.length === 0) return null;

  const previewTitle = preview?.anime.title.english ?? preview?.anime.title.romaji ?? '';
  const previewImage = preview?.anime.bannerImage || posters?.get(preview?.anime.id ?? 0) || preview?.anime.coverImage.large || preview?.anime.coverImage.medium || '';
  const previewSynopsis = preview?.anime.description ?? null;
  const previewGenres = preview?.anime.genres?.slice(0, 3) ?? [];

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
          {anime.map((item) => {
            const itemTitle = item.title.english ?? item.title.romaji;
            const slug = itemTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const eps = item.episodes ?? null;
            const imgSrc = posters?.get(item.id) || item.coverImage.large || item.coverImage.medium;

            return (
              <Link
                key={item.id}
                href={`/anime/${slug}?id=${item.id}`}
                className="flex-shrink-0 w-[180px] group block"
                onMouseEnter={(e) => handleMouseEnter(item, e)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="relative overflow-hidden rounded-xl bg-gray-800 aspect-[2/3] ring-1 ring-white/[0.04] group-hover:ring-white/[0.08] group-focus-visible:ring-white/[0.08] transition-all duration-300">
                  <img
                    src={imgSrc}
                    alt={itemTitle}
                    className="w-full h-full object-cover group-hover:scale-105 group-focus-visible:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300" />

                  {eps && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-xs font-semibold text-white/90 flex items-center leading-none">
                      {eps} EP
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-transform duration-300" />
                </div>
                <p className="mt-2 text-[13px] text-white truncate group-hover:text-theme-primary group-focus-visible:text-theme-primary transition font-medium">
                  {itemTitle}
                </p>
              </Link>
            );
          })}
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
              {previewSynopsis && (
                <p className="text-xs text-gray-400 mb-2 line-clamp-3">{previewSynopsis.replace(/<[^>]*>/g, '')}</p>
              )}
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
