import { getFilmpalastMovie, type FilmStreamSource } from './filmpalast-client';
import { getMovie2kMovie, searchAndGetMovie2kStreams, searchAndGetMovie2kInfo, type Movie2kStreamSource } from './movie2k-client';

export interface AggregatedMovie {
  title: string;
  slug: string;
  description: string;
  posterImage: string;
  bannerImage: string;
  genres: string[];
  year: number | null;
  rating: number | null;
  streamSources: FilmStreamSource[];
}

export async function getAggregatedMovie(slug: string): Promise<AggregatedMovie | null> {
  const [filmpalast, movie2kStreams] = await Promise.all([
    getFilmpalastMovie(slug).catch(() => null),
    searchAndGetMovie2kStreams(slug.replace(/-/g, ' ')).catch(() => null),
  ]);

  if (!filmpalast && (!movie2kStreams || movie2kStreams.length === 0)) return null;

  const fp = filmpalast;
  const m2kInfo = await searchAndGetMovie2kInfo(slug.replace(/-/g, ' ')).catch(() => null);

  const streamSources: FilmStreamSource[] = [
    ...(fp?.streamSources ?? []),
    ...(movie2kStreams ?? []),
  ];

  return {
    title: fp?.title || m2kInfo?.title || slug.replace(/-/g, ' '),
    slug,
    description: fp?.description || '',
    posterImage: fp?.posterImage || m2kInfo?.posterImage || '',
    bannerImage: fp?.bannerImage || fp?.posterImage || '',
    genres: fp?.genres || [],
    year: fp?.year || null,
    rating: fp?.rating || null,
    streamSources,
  };
}
