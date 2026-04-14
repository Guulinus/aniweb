'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import type { AnimeBasic } from '@/types';

interface HorizontalAnimeSectionProps {
  title: string;
  anime: AnimeBasic[];
  loading?: boolean;
}

export default function HorizontalAnimeSection({ title, anime, loading }: HorizontalAnimeSectionProps) {
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
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="flex gap-4 overflow-hidden py-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40">
              <div className="aspect-[3/4] bg-gray-800 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (anime.length === 0) {
    return (
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="text-gray-400">Keine Ergebnisse gefunden</div>
      </section>
    );
  }

  const previewTitle = preview?.anime.title.english ?? preview?.anime.title.romaji ?? '';
  const previewImage = preview?.anime.bannerImage || preview?.anime.coverImage.large || preview?.anime.coverImage.medium || '';
  const previewScore = preview?.anime.averageScore ? `${preview.anime.averageScore / 10}/10` : 'N/A';
  const previewEps = preview?.anime.episodes ?? '?';

  const previewStyle = preview ? (() => {
    const PREVIEW_WIDTH = 288;
    const GAP = 16;
    const spaceOnRight = window.innerWidth - preview.cardRect.right;
    const left = spaceOnRight >= PREVIEW_WIDTH + GAP 
      ? preview.cardRect.right + GAP 
      : preview.cardRect.left - GAP - PREVIEW_WIDTH;
    return { left, top: preview.cardRect.top };
  })() : {};

  return (
    <section className="mb-12 relative">
      <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>

      <div className="relative">
        {showLeftFade && (
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-950 to-transparent z-10 pointer-events-none" />
        )}

        {showLeftFade && (
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-gray-900/80 hover:bg-gray-800 rounded-full flex items-center justify-center text-white transition"
          >
            ‹
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {anime.map((item) => {
            const itemTitle = item.title.english ?? item.title.romaji;
            const slug = itemTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            return (
              <Link
                key={item.id}
                href={`/anime/${slug}?id=${item.id}`}
                className="flex-shrink-0 w-40 group block"
                onMouseEnter={(e) => handleMouseEnter(item, e)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="relative overflow-hidden rounded-lg bg-gray-800 aspect-[3/4]">
                  <img
                    src={item.coverImage.large || item.coverImage.medium}
                    alt={itemTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="mt-2 text-sm text-white truncate group-hover:text-purple-400 transition">
                  {itemTitle}
                </p>
              </Link>
            );
          })}
        </div>

        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-950 to-transparent z-10 pointer-events-none" />
        )}

        {showRightFade && (
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-gray-900/80 hover:bg-gray-800 rounded-full flex items-center justify-center text-white transition"
          >
            ›
          </button>
        )}
      </div>

      {(preview || previewVisible) && (
        <div
          className={`fixed bg-gray-900 rounded-lg overflow-hidden shadow-2xl w-72 z-50 pointer-events-none transition-opacity duration-200 ${previewVisible ? 'opacity-100' : 'opacity-0'}`}
          style={previewVisible ? previewStyle : {}}
        >
          {preview && previewImage && (
            <img
              src={previewImage}
              alt={previewTitle}
              className="w-full h-40 object-cover"
            />
          )}
          {preview && (
            <div className="p-3">
              <h3 className="font-bold text-white text-base mb-2 truncate">
                {previewTitle}
              </h3>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Score: {previewScore}</span>
                <span>Episodes: {previewEps}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}