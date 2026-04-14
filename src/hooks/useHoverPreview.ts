'use client';

import { useEffect, useState, useRef } from 'react';
import type { AnimeBasic } from '@/types';

export function useHoverPreview(anime: AnimeBasic, containerRef: React.RefObject<HTMLElement>) {
  const [showPreview, setShowPreview] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('[data-anime-id]');
      
      if (card && card === containerRef.current) {
        console.log('Enter:', anime.title.english ?? anime.title.romaji);
        timeoutRef.current = setTimeout(() => {
          setPosition({ x: e.clientX, y: e.clientY });
          setShowPreview(true);
          console.log('Showing preview');
        }, 1000);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('[data-anime-id]');
      
      if (card && card === containerRef.current) {
        console.log('Leave');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setShowPreview(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (showPreview) {
        setPosition({ x: e.clientX, y: e.clientY });
      }
    };

    document.addEventListener('mouseover', handleMouseEnter);
    document.addEventListener('mouseout', handleMouseLeave);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseover', handleMouseEnter);
      document.removeEventListener('mouseout', handleMouseLeave);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [anime, containerRef, showPreview]);

  return { showPreview, position };
}