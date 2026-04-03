'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AniworldSeason } from '@/types';

interface EpisodeListProps {
  animeSlug: string;
  aniworldSlug: string | null;
  animeId: number;
  seasons: AniworldSeason[];
}

export default function EpisodeList({ animeSlug, aniworldSlug, animeId, seasons }: EpisodeListProps) {
  const [activeSeason, setActiveSeason] = useState<number>(
    seasons.length > 0 ? (seasons.find(s => s.seasonNumber === 1) ? 1 : seasons[0].seasonNumber) : 0
  );

  if (seasons.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 text-center">
        <p className="text-gray-400">No German dub available for this anime</p>
        <p className="text-sm text-gray-500 mt-2">This anime is not available on Aniworld.to</p>
      </div>
    );
  }

  const currentSeason = seasons.find(s => s.seasonNumber === activeSeason);

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="flex flex-wrap gap-2 mb-4">
        {seasons.map((season) => (
          <button
            key={season.seasonNumber}
            onClick={() => setActiveSeason(season.seasonNumber)}
            className={`px-4 py-2 text-sm rounded-lg transition ${
              activeSeason === season.seasonNumber
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {season.seasonNumber === 0 ? 'Movies' : `Season ${season.seasonNumber}`}
          </button>
        ))}
      </div>

      {currentSeason && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {currentSeason.episodes.map((ep) => {
            return (
              <Link
                key={ep.number}
                href={`/watch/${animeSlug}/${activeSeason}/${ep.number}?id=${animeId}&title=${encodeURIComponent(ep.title)}${aniworldSlug ? `&awSlug=${encodeURIComponent(aniworldSlug)}` : ''}`}
                className="bg-gray-700 hover:bg-purple-600 text-white text-center py-3 rounded-lg transition text-sm"
              >
                Episode {ep.number}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
