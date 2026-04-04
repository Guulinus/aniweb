import { NextRequest, NextResponse } from 'next/server';
import { searchAnime, getAnimeById } from '@/lib/anilist';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const query = request.nextUrl.searchParams.get('q');

  try {
    if (id) {
      const idNum = parseInt(id);
      if (isNaN(idNum) || idNum <= 0) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }
      const anime = await getAnimeById(idNum);
      return NextResponse.json({ results: [anime], hasNextPage: false });
    }

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], hasNextPage: false });
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
    const perPage = parseInt(request.nextUrl.searchParams.get('perPage') ?? '20');

    const data = await searchAnime(query, isNaN(page) ? 1 : page, Math.min(isNaN(perPage) ? 20 : perPage, 50));
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json(
      { error: 'Failed to search anime' },
      { status: 500 },
    );
  }
}
