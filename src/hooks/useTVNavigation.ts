'use client';

import { useEffect, useCallback } from 'react';

interface TvnavigatorOptions {
  selector?: string;
  onSelect?: (element: HTMLElement) => void;
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onBack?: () => void;
}

export function useTVNavigation(options: TvnavigatorOptions = {}) {
  const { selector = 'a, button, [role="button"], [tabindex]', onSelect } = options;

  const navigateDirection = useCallback((element: HTMLElement, direction: 'up' | 'down' | 'left' | 'right') => {
    const allElements = document.querySelectorAll('a, button, [role="button"], [tabindex]:not([tabindex="-1"])');
    const elements = Array.from(allElements) as HTMLElement[];
    
    if (elements.length === 0) return;

    const currentIndex = elements.indexOf(element);
    if (currentIndex === -1) {
      elements[0]?.focus();
      return;
    }

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let bestElement: HTMLElement | null = null;
    let bestScore = Infinity;

    for (const el of elements) {
      if (el === element) continue;

      const elRect = el.getBoundingClientRect();
      const elCenterX = elRect.left + elRect.width / 2;
      const elCenterY = elRect.top + elRect.height / 2;

      let score = Infinity;
      let isValid = false;

      if (direction === 'right') {
        if (elCenterX > centerX && Math.abs(elCenterY - centerY) < rect.height * 1.5) {
          score = elCenterX - centerX;
          isValid = true;
        }
      } else if (direction === 'left') {
        if (elCenterX < centerX && Math.abs(elCenterY - centerY) < rect.height * 1.5) {
          score = centerX - elCenterX;
          isValid = true;
        }
      } else if (direction === 'down') {
        if (elCenterY > centerY && Math.abs(elCenterX - centerX) < rect.width * 1.5) {
          score = elCenterY - centerY;
          isValid = true;
        }
      } else if (direction === 'up') {
        if (elCenterY < centerY && Math.abs(elCenterX - centerX) < rect.width * 1.5) {
          score = centerY - elCenterY;
          isValid = true;
        }
      }

      if (isValid && score < bestScore) {
        bestScore = score;
        bestElement = el;
      }
    }

    if (bestElement) {
      bestElement.focus();
      try { bestElement.scrollIntoView({ block: 'center' }); } catch {}
    }
  }, []);

  const handleKey = useCallback((e: KeyboardEvent) => {
    const target = document.activeElement as HTMLElement;
    if (!target || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    // Don't intercept when inside video player (arrow keys seek, space plays/pauses)
    const inVideoPlayer = target.closest('.artplayer') || target.closest('[data-player]');
    if (inVideoPlayer) return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        navigateDirection(target, 'right');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigateDirection(target, 'left');
        break;
      case 'ArrowUp':
        e.preventDefault();
        navigateDirection(target, 'up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateDirection(target, 'down');
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (target.tagName === 'A') {
          (target as HTMLAnchorElement).click();
        } else if (target.tagName === 'BUTTON') {
          (target as HTMLButtonElement).click();
        } else if (onSelect) {
          onSelect(target);
        }
        break;
      case 'Escape':
      case 'Backspace':
        if (options.onBack) {
          e.preventDefault();
          options.onBack();
        }
        break;
    }
  }, [navigateDirection, onSelect, options.onBack]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);
}

export default function TVNavigationWrapper({ children }: { children: React.ReactNode }) {
  useTVNavigation();
  return children;
}