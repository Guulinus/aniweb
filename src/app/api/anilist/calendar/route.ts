import { NextResponse } from 'next/server';
import { getAnimeCalendar } from '@/lib/anilist';

export async function GET() {
  try {
    const data = await getAnimeCalendar();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch {
    return NextResponse.json(
      { error: 'Failed to get calendar' },
      { status: 500 },
    );
  }
}