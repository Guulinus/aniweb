import { NextRequest, NextResponse } from 'next/server';
import { searchFilmpalast } from '@/lib/filmpalast-client';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchFilmpalast(q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
