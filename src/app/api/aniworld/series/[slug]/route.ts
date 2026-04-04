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
    const seasons = await getAniworldSeasons(slug);
    return NextResponse.json({ seasons, available: seasons.length > 0 }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch series' },
      { status: 500 },
    );
  }
}
