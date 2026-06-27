import { NextRequest, NextResponse } from 'next/server';
import { findAniworldSeries } from '@/lib/aniworld-client';

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title');
  const year = request.nextUrl.searchParams.get('year') ? parseInt(request.nextUrl.searchParams.get('year')!) : null;
  const englishTitle = request.nextUrl.searchParams.get('english');

  if (!title) {
    return NextResponse.json({ error: 'Missing title parameter' }, { status: 400 });
  }

  try {
    const result = await Promise.race([
      findAniworldSeries(title, year, englishTitle),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Search timed out')), 30000)),
    ]);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[aniworld/find] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search', found: false },
      { status: 500 }
    );
  }
}
