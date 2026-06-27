import { NextRequest, NextResponse } from 'next/server';
import { searchAnime, getAnimeById } from '@/lib/anilist';
import { searchAnimeDb, getAnimeById as getAnimeByIdDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const query = request.nextUrl.searchParams.get('q');
  const useDb = request.nextUrl.searchParams.get('db') === 'true';
  const sort = request.nextUrl.searchParams.get('sort') ?? 'POPULARITY_DESC';

  try {
    // If ID provided, always use AniList for full detail (relations, episodeThumbnails, etc.)
    if (id) {
      const idNum = parseInt(id);
      if (isNaN(idNum) || idNum <= 0) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }
      const anime = await getAnimeById(idNum);
      return NextResponse.json({ results: [anime], hasNextPage: false, source: 'anilist' }, {
        headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
      });
    }

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], hasNextPage: false });
    }

    // Use local DB for faster search
    if (useDb || sort === 'POPULARITY_DESC') {
      const dbResults = searchAnimeDb(query, 50, 0);
      if (dbResults.length > 0) {
        return NextResponse.json({
          results: dbResults.map(a => ({
            id: a.id,
            idMal: null,
            title: { romaji: a.title_romaji, english: a.title_english, native: a.title_native },
            coverImage: { large: a.cover_image, medium: a.cover_image },
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
        });
      }
    }

    // Fall back to AniList API
    const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
    const perPage = parseInt(request.nextUrl.searchParams.get('perPage') ?? '20');
    const data = await searchAnime(query, isNaN(page) ? 1 : page, Math.min(isNaN(perPage) ? 20 : perPage, 50), sort);
    return NextResponse.json({ ...data, source: 'anilist' }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json(
      { error: 'Failed to search anime' },
      { status: 500 },
    );
  }
}
