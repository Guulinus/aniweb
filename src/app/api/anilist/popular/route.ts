import { NextRequest, NextResponse } from 'next/server';
import { getPopularAnime } from '@/lib/anilist';

export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
  const perPage = parseInt(request.nextUrl.searchParams.get('perPage') ?? '20');

  try {
    const data = await getPopularAnime(page, Math.min(perPage, 50));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch popular anime' },
      { status: 500 },
    );
  }
}
