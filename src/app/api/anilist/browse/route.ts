import { NextRequest, NextResponse } from 'next/server';
import { browseAnime } from '@/lib/anilist';

export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
  const perPage = parseInt(request.nextUrl.searchParams.get('perPage') ?? '20');
  const genres = request.nextUrl.searchParams.getAll('genre');
  const status = request.nextUrl.searchParams.get('status') || undefined;
  const format = request.nextUrl.searchParams.get('format') || undefined;
  const sort = request.nextUrl.searchParams.get('sort') || undefined;
  const year = request.nextUrl.searchParams.get('year') ? parseInt(request.nextUrl.searchParams.get('year')!) : undefined;

  try {
    const data = await browseAnime({
      page,
      perPage: Math.min(perPage, 50),
      genres: genres.length > 0 ? genres : undefined,
      status,
      format,
      sort: sort ? [sort] : undefined,
      year,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to browse anime' },
      { status: 500 },
    );
  }
}
