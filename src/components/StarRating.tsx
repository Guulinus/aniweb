'use client';

import { useEffect, useState } from 'react';

interface StarRatingProps {
  animeId: number;
  size?: 'sm' | 'md' | 'lg';
}

function loadRating(animeId: number): number {
  try {
    const data = JSON.parse(localStorage.getItem('ratings') ?? '{}');
    return data[animeId] ?? 0;
  } catch { return 0; }
}

function saveRating(animeId: number, value: number) {
  try {
    const data = JSON.parse(localStorage.getItem('ratings') ?? '{}');
    if (value === 0) {
      delete data[animeId];
    } else {
      data[animeId] = value;
    }
    localStorage.setItem('ratings', JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('ratings-updated', { detail: { animeId, value } }));
    // Lazy-load sync
    import('@/lib/syncClient').then(m => m.pushServerData()).catch(() => {});
  } catch {}
}

export default function StarRating({ animeId, size = 'md' }: StarRatingProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    setRating(loadRating(animeId));
  }, [animeId]);

  const sizeMap = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  const cls = sizeMap[size];

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <button
          key={star}
          onClick={() => saveRating(animeId, rating === star ? 0 : star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`${cls} transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary rounded`}
          aria-label={`Rate ${star} out of 10`}
        >
          <svg viewBox="0 0 20 20" fill={star <= (hover || rating) ? '#a855f7' : '#374151'} className="w-full h-full">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
      {(hover || rating) > 0 && (
        <span className="text-xs text-gray-400 ml-1 min-w-[2rem]">
          {hover || rating}/10
        </span>
      )}
    </div>
  );
}
