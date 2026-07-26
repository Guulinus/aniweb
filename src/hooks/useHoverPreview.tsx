'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnimeBasic } from '@/types';

export function useHoverPreview(anime: AnimeBasic | null, cardRect: DOMRect | null) {
  const [showPreview, setShowPreview] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowPreview(true), 1000);
  }, []);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowPreview(false);
  }, []);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return { showPreview, show, hide };
}
