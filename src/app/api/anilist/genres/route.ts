import { NextResponse } from 'next/server';
import { getGenres } from '@/lib/anilist';

export async function GET() {
  try {
    const genres = await getGenres();
    return NextResponse.json({ genres });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch genres' },
      { status: 500 },
    );
  }
}
