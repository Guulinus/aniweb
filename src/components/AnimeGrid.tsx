import AnimeCard from './AnimeCard';
import type { AnimeBasic } from '@/types';

interface AnimeGridProps {
  anime: AnimeBasic[];
}

export default function AnimeGrid({ anime }: AnimeGridProps) {
  if (anime.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No anime found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {anime.map((item) => (
        <AnimeCard key={item.id} anime={item} />
      ))}
    </div>
  );
}
