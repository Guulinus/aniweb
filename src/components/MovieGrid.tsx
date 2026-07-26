'use client';
import FilmCard from './FilmCard';

interface Movie {
  title: string;
  slug: string;
  posterImage: string;
  year?: number | null;
}

interface Props {
  movies: Movie[];
  loading?: boolean;
}

export default function MovieGrid({ movies, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[180px]">
            <div className="aspect-[2/3] bg-gray-800 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Keine Filme gefunden</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {movies.map((movie) => (
        <FilmCard key={movie.slug} {...movie} />
      ))}
    </div>
  );
}
