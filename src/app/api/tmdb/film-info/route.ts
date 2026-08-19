import { NextRequest, NextResponse } from 'next/server';
import { getTmdbFilmInfo } from '@/lib/tmdb-client';

const filmInfoCache = new Map<string, { posterImage: string; runtimeMinutes: number | null; year: number | null }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();

export async function GET(request: NextRequest) {
  const titles = request.nextUrl.searchParams.getAll('title');
  if (titles.length === 0) {
    return NextResponse.json({ films: {} });
  }

  const now = Date.now();
  const films: Record<string, { posterImage: string; runtimeMinutes: number | null; year: number | null }> = {};
  const uncachedTitles: string[] = [];

  for (const title of titles) {
    const cached = filmInfoCache.get(title);
    const ts = cacheTimestamps.get(title) ?? 0;
    if (cached && (now - ts) < CACHE_TTL) {
      films[title] = cached;
    } else {
      uncachedTitles.push(title);
    }
  }

  if (uncachedTitles.length > 0) {
    await Promise.all(uncachedTitles.map(async (title) => {
      try {
        const info = await getTmdbFilmInfo(title);
        if (info) {
          const entry = { posterImage: info.posterImage, runtimeMinutes: info.runtimeMinutes, year: info.year };
          films[title] = entry;
          filmInfoCache.set(title, entry);
          cacheTimestamps.set(title, now);
        }
      } catch {}
    }));
  }

  return NextResponse.json({ films }, { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } });
}
