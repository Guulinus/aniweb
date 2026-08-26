import { NextRequest, NextResponse } from 'next/server';
import { getPopularAnime as getPopularAnimeApi } from '@/lib/anilist';
import { getPopularAnime as getPopularAnimeDb } from '@/lib/animeCache';

export async function GET(request: NextRequest) {
  const useDb = request.nextUrl.searchParams.get('db') !== 'false';
  const perPage = Math.min(parseInt(request.nextUrl.searchParams.get('perPage') ?? '20'), 50);

  try {
    // Use local DB first for speed
    if (useDb) {
      const dbResults = getPopularAnimeDb(perPage, 0);
      if (dbResults.length > 0) {
        return NextResponse.json({
          results: dbResults.map(a => ({
            id: a.id,
            title: { romaji: a.title_romaji, english: a.title_english, native: a.title_native },
            coverImage: { large: a.cover_image, medium: a.cover_image, color: a.cover_color ?? null },
            bannerImage: a.banner_image,
            format: a.format,
            status: a.status,
            episodes: a.episodes,
            averageScore: a.average_score,
            year: a.year,
            genres: a.genres ? JSON.parse(a.genres) : [],
            description: a.description,
          })),
          hasNextPage: false,
          source: 'local'
        }, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } });
      }
    }
    
    // Fall back to AniList
    const data = await getPopularAnimeApi(1, perPage);
    return NextResponse.json({ ...data, source: 'anilist' }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
  } catch (err) {
    console.error('[Popular] Failed:', err);
    return NextResponse.json({ results: [], hasNextPage: false, error: 'Failed to fetch popular anime' });
  }
}
