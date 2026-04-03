import { NextRequest, NextResponse } from 'next/server';
import { findAniworldSeries } from '@/lib/aniworld-client';

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title');
  const year = request.nextUrl.searchParams.get('year') ? parseInt(request.nextUrl.searchParams.get('year')!) : null;

  if (!title) {
    return NextResponse.json({ error: 'Missing title parameter' }, { status: 400 });
  }

  const result = await findAniworldSeries(title, year);
  return NextResponse.json(result);
}
