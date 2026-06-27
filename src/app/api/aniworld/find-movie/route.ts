import { NextRequest, NextResponse } from 'next/server';
import { findAniworldMovie } from '@/lib/aniworld-client';

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title');
  const year = request.nextUrl.searchParams.get('year') ? parseInt(request.nextUrl.searchParams.get('year')!) : null;

  if (!title) {
    return NextResponse.json({ error: 'Missing title parameter' }, { status: 400 });
  }

  try {
    const result = await Promise.race([
      findAniworldMovie(title, year),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Search timed out')), 30000)),
    ]);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[aniworld/find-movie] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search', found: false },
      { status: 500 }
    );
  }
}
