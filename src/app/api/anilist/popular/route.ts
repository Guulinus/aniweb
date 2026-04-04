import { NextRequest, NextResponse } from 'next/server';
import { getPopularAnime } from '@/lib/anilist';

export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
  const perPage = parseInt(request.nextUrl.searchParams.get('perPage') ?? '20');

  try {
    const data = await getPopularAnime(isNaN(page) ? 1 : page, Math.min(isNaN(perPage) ? 20 : perPage, 50));
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch popular anime' },
      { status: 500 },
    );
  }
}
