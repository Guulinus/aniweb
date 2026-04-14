import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const testUrl = request.nextUrl.searchParams.get('url');
  
  if (!testUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
    
    const text = await res.text();
    const hasLangKey = text.includes('data-lang-key');
    const hasEpisodeNumber = text.includes('itemprop="episodeNumber"');
    const hasSeasonEpisodeTitle = text.includes('seasonEpisodeTitle');
    
    return NextResponse.json({
      status: res.status,
      length: text.length,
      hasLangKey,
      hasEpisodeNumber,
      hasSeasonEpisodeTitle,
      sample: text.slice(0, 500),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch',
    }, { status: 500 });
  }
}