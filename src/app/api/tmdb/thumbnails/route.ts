import { NextRequest, NextResponse } from 'next/server';
import { searchTmdbId, getTmdbSeasonThumbnails, getTmdbShowSeasons } from '@/lib/tmdb-client';

export async function GET(request: NextRequest) {
  const romaji = request.nextUrl.searchParams.get('romaji');
  const english = request.nextUrl.searchParams.get('english');
  const seasonParam = request.nextUrl.searchParams.get('seasons');

  if (!romaji) {
    return NextResponse.json({ error: 'Missing romaji title' }, { status: 400 });
  }

  try {
    const tmdbId = await searchTmdbId(romaji, english);
    if (!tmdbId) {
      return NextResponse.json({ thumbnails: {}, tmdbId: null });
    }

    const seasonNumbers = seasonParam
      ? seasonParam.split(',').map(Number).filter(n => !isNaN(n) && n > 0)
      : [1];

    const [thumbnails, seasonNames] = await Promise.all([
      getTmdbSeasonThumbnails(tmdbId, seasonNumbers),
      seasonNumbers.length > 1 ? getTmdbShowSeasons(tmdbId) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      tmdbId,
      thumbnails,
      seasonNames,
      source: 'tmdb',
    });
  } catch {
    return NextResponse.json({ thumbnails: {}, tmdbId: null }, { status: 500 });
  }
}
