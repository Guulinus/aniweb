import { NextResponse } from 'next/server';
import { getAniworldSeasons } from '@/lib/aniworld-client';

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json(
      { error: 'Invalid slug format' },
      { status: 400 },
    );
  }

  try {
    const seasons = await Promise.race([
      getAniworldSeasons(slug),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Series fetch timed out')), 25000)),
    ]);
    return NextResponse.json({ seasons, available: seasons.length > 0 }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    console.error('[aniworld/series] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch series', available: false },
      { status: 500 },
    );
  }
}
