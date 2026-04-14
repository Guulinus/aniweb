'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import type { AnimeBasic } from '@/types';

interface HoverPreviewContextType {
  showPreview: (anime: AnimeBasic, mouseX: number, mouseY: number) => void;
  hidePreview: () => void;
}

const HoverPreviewContext = createContext<HoverPreviewContextType | null>(null);

export function useHoverPreview() {
  return useContext(HoverPreviewContext);
}

export function HoverPreviewProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [anime, setAnime] = useState<AnimeBasic | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showPreview = useCallback((a: AnimeBasic, mx: number, my: number) => {
    timeoutRef.current = setTimeout(() => {
      setAnime(a);
      setPosition({ x: mx, y: my });
      setVisible(true);
    }, 1000);
  }, []);

  const hidePreview = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const title = anime?.title.english ?? anime?.title.romaji ?? '';
  const imageUrl = anime?.coverImage.large || anime?.coverImage.medium || '';
  const score = anime?.averageScore ? `${anime.averageScore / 10}/10` : 'N/A';
  const episodes = anime?.episodes ?? '?';

  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x + 20, typeof window !== 'undefined' ? window.innerWidth - 300 : 700),
    top: Math.min(position.y - 10, typeof window !== 'undefined' ? window.innerHeight - 350 : 400),
  };

  return (
    <HoverPreviewContext.Provider value={{ showPreview, hidePreview }}>
      {children}
      {visible && anime && (
        <div 
          className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl w-72 z-50 pointer-events-none"
          style={popupStyle}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-40 object-cover"
            />
          )}
          <div className="p-3">
            <h3 className="font-bold text-white text-base mb-2 truncate">
              {title}
            </h3>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Score: {score}</span>
              <span>Episodes: {episodes}</span>
            </div>
          </div>
        </div>
      )}
    </HoverPreviewContext.Provider>
  );
}