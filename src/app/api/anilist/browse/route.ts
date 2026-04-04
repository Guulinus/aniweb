import { NextRequest, NextResponse } from 'next/server';
import { browseAnime } from '@/lib/anilist';

const VALID_STATUSES = new Set(['CURRENT', 'PLANNING', 'COMPLETED', 'DROPPED', 'PAUSED', 'NOT_YET_RELEASED', 'CANCELLED']);
const VALID_FORMATS = new Set(['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC']);
const VALID_SORTS = new Set(['POPULARITY_DESC', 'TRENDING_DESC', 'SCORE_DESC', 'FAVOURITES_DESC', 'TITLE_ROMAJI', 'START_DATE', 'END_DATE']);

export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get('page');
  const perPageParam = request.nextUrl.searchParams.get('perPage');
  const genres = request.nextUrl.searchParams.getAll('genre');
  const status = request.nextUrl.searchParams.get('status') || undefined;
  const format = request.nextUrl.searchParams.get('format') || undefined;
  const sort = request.nextUrl.searchParams.get('sort') || undefined;
  const yearParam = request.nextUrl.searchParams.get('year');

  const page = parseInt(pageParam ?? '1');
  const perPage = parseInt(perPageParam ?? '20');
  const year = yearParam ? parseInt(yearParam) : undefined;

  const validatedStatus = status && VALID_STATUSES.has(status) ? status : undefined;
  const validatedFormat = format && VALID_FORMATS.has(format) ? format : undefined;
  const validatedSort = sort && VALID_SORTS.has(sort) ? [sort] : undefined;

  try {
    const data = await browseAnime({
      page: isNaN(page) ? 1 : page,
      perPage: Math.min(isNaN(perPage) ? 20 : perPage, 50),
      genres: genres.length > 0 ? genres : undefined,
      status: validatedStatus,
      format: validatedFormat,
      sort: validatedSort,
      year: year && !isNaN(year) ? year : undefined,
    });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json(
      { error: 'Failed to browse anime' },
      { status: 500 },
    );
  }
}
