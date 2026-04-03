import { NextRequest, NextResponse } from 'next/server';
import { searchAniworld } from '@/lib/aniworld-client';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchAniworld(query);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search Aniworld' },
      { status: 500 },
    );
  }
}
