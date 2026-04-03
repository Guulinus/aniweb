import { NextResponse } from 'next/server';
import { getAniworldSeasons } from '@/lib/aniworld-client';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const seasons = await getAniworldSeasons(slug);
    return NextResponse.json({ seasons, available: seasons.length > 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch series' },
      { status: 500 },
    );
  }
}
