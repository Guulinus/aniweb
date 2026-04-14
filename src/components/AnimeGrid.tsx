'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { AnimeBasic } from '@/types';
import { toSlug } from '@/lib/slug';

interface AnimeGridProps {
  anime: AnimeBasic[];
}

export default function AnimeGrid({ anime }: AnimeGridProps) {
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

  if (anime.length === 0) {
    return <div className="text-center py-16 text-gray-400"><p className="text-lg">No anime found</p></div>;
  }

  const previewTitle = preview?.anime.title.english ?? preview?.anime.title.romaji ?? '';
  const previewImage = preview?.anime.bannerImage || preview?.anime.coverImage.large || preview?.anime.coverImage.medium || '';
  const previewScore = preview?.anime.averageScore ? `${preview.anime.averageScore / 10}/10` : 'N/A';
  const previewEps = preview?.anime.episodes ?? '?';

  const previewStyle: React.CSSProperties = preview ? (() => {
    const PREVIEW_WIDTH = 288;
    const GAP = 16;
    const spaceOnRight = window.innerWidth - preview.cardRect.right;
    const left = spaceOnRight >= PREVIEW_WIDTH + GAP 
      ? preview.cardRect.right + GAP 
      : preview.cardRect.left - GAP - PREVIEW_WIDTH;
    return { left, top: preview.cardRect.top };
  })() : {};

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {anime.map((item) => {
          const title = item.title.english ?? item.title.romaji;
          const slug = toSlug(title);
          
          return (
            <Link
              key={item.id}
              href={`/anime/${slug}?id=${item.id}`}
              className="group block"
              onMouseEnter={(e) => handleMouseEnter(item, e)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="relative overflow-hidden rounded-lg bg-gray-800 aspect-[3/4]">
                <img
                  src={item.coverImage.large || item.coverImage.medium}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="mt-2 text-sm text-white truncate group-hover:text-purple-400 transition">
                {title}
              </h3>
              {item.year && (
                <p className="text-xs text-gray-500">{item.year}</p>
              )}
            </Link>
          );
        })}
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
    </>
  );
}