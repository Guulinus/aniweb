import { NextRequest, NextResponse } from 'next/server';
import { searchTmdbId, getTmdbSeasonPoster } from '@/lib/tmdb-client';

export async function GET(request: NextRequest) {
  const romaji = request.nextUrl.searchParams.get('romaji');
  const english = request.nextUrl.searchParams.get('english');
  const season = parseInt(request.nextUrl.searchParams.get('season') ?? '0');

  if (!romaji || !season) {
    return NextResponse.json({ error: 'Missing romaji title or season' }, { status: 400 });
  }

  try {
    const tmdbId = await searchTmdbId(romaji, english);
    if (!tmdbId) return NextResponse.json({ poster: null, tmdbId: null });

    const poster = await getTmdbSeasonPoster(tmdbId, season);
    return NextResponse.json({ poster, tmdbId });
  } catch {
    return NextResponse.json({ poster: null, tmdbId: null }, { status: 500 });
  }
}
