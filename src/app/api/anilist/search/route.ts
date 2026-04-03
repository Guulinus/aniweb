import { NextRequest, NextResponse } from 'next/server';
import { searchAnime } from '@/lib/anilist';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], hasNextPage: false });
  }

  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
  const perPage = parseInt(request.nextUrl.searchParams.get('perPage') ?? '20');

  try {
    const data = await searchAnime(query, page, Math.min(perPage, 50));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search anime' },
      { status: 500 },
    );
  }
}
