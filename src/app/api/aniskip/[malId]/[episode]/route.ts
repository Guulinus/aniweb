import { NextRequest, NextResponse } from 'next/server';

const ANISKIP_API = 'https://api.aniskip.com/v2/skip-times';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { malId: string; episode: string } }) {
  try {
    const { malId, episode } = params;
    if (!malId || malId === 'null' || malId === 'undefined') {
      return NextResponse.json({ found: false, results: [] });
    }

    const episodeLength = request.nextUrl.searchParams.get('duration') || '1440';
    const url = `${ANISKIP_API}/${malId}/${episode}?types=op&types=ed&episodeLength=${episodeLength}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });

    if (!res.ok) {
      return NextResponse.json({ found: false, results: [] });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
    });
  } catch {
    return NextResponse.json({ found: false, results: [] });
  }
}
