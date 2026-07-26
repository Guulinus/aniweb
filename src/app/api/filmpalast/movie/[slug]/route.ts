import { NextRequest, NextResponse } from 'next/server';
import { getFilmpalastMovie } from '@/lib/filmpalast-client';
import { searchAndGetMovie2kInfo } from '@/lib/movie2k-client';

type RouteParams = { slug: string };

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams },
) {
  const { slug } = params;

  try {
    const [filmpalast, movie2kInfo] = await Promise.all([
      getFilmpalastMovie(slug).catch(() => null),
      searchAndGetMovie2kInfo(slug.replace(/-/g, ' ')).catch(() => null),
    ]);

    if (!filmpalast && !movie2kInfo) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const movie = {
      title: filmpalast?.title || movie2kInfo?.title || slug.replace(/-/g, ' '),
      slug,
      description: filmpalast?.description || '',
      posterImage: filmpalast?.posterImage || movie2kInfo?.posterImage || '',
      bannerImage: filmpalast?.bannerImage || filmpalast?.posterImage || '',
      genres: filmpalast?.genres || [],
      year: filmpalast?.year || null,
      rating: filmpalast?.rating || null,
      streamSources: filmpalast?.streamSources || [],
      source: filmpalast ? 'filmpalast' : 'movie2k',
    };

    return NextResponse.json(movie);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch movie' },
      { status: 500 }
    );
  }
}
