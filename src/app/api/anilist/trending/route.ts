import { NextRequest, NextResponse } from 'next/server';
import { getTrendingAnime } from '@/lib/anilist';

export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
  const perPage = parseInt(request.nextUrl.searchParams.get('perPage') ?? '20');

  try {
    const data = await getTrendingAnime(page, Math.min(perPage, 50));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch trending anime' },
      { status: 500 },
    );
  }
}
