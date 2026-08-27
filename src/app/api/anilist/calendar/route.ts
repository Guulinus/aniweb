import { NextResponse } from 'next/server';
import { getAnimeCalendar } from '@/lib/anilist';

export async function GET() {
  try {
    const data = await getAnimeCalendar();
    // `data` is a Map — JSON.stringify (which NextResponse.json uses) silently serializes any
    // Map as `{}`, so this endpoint has always returned an empty object regardless of what
    // getAnimeCalendar found. Converting to a plain object is the actual fix.
    return NextResponse.json(Object.fromEntries(data), { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch {
    return NextResponse.json(
      { error: 'Failed to get calendar' },
      { status: 500 },
    );
  }
}