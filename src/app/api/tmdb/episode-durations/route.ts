import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = '7a6f6473c46188721c31804f166eb53d';

const durationsCache = new Map<string, Record<number, number>>();
const cacheTimestamps = new Map<string, number>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const tmdbId = request.nextUrl.searchParams.get('tmdbId');
  const seasonStr = request.nextUrl.searchParams.get('season');

  if (!tmdbId || !seasonStr) {
    return NextResponse.json({ error: 'Missing tmdbId or season param' }, { status: 400 });
  }

  const season = parseInt(seasonStr);
  if (isNaN(season)) {
    return NextResponse.json({ error: 'Invalid season number' }, { status: 400 });
  }

  const cacheKey = `${tmdbId}:${season}`;
  const now = Date.now();
  const cached = durationsCache.get(cacheKey);
  const ts = cacheTimestamps.get(cacheKey) ?? 0;

  if (cached && (now - ts) < CACHE_TTL) {
    return NextResponse.json({ durations: cached });
  }

  try {
    const res = await fetch(
      `${TMDB_BASE}/tv/${tmdbId}/season/${season}?api_key=${TMDB_API_KEY}&language=de-DE`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json();

    const durations: Record<number, number> = {};
    if (data.episodes?.length > 0) {
      for (const ep of data.episodes) {
        if (ep.episode_number && ep.runtime && ep.runtime > 0) {
          durations[ep.episode_number] = ep.runtime;
        }
      }
    }

    durationsCache.set(cacheKey, durations);
    cacheTimestamps.set(cacheKey, now);

    return NextResponse.json({ durations }, {
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
    });
  } catch {
    return NextResponse.json({ durations: {} });
  }
}
