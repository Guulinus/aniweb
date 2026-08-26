import { NextRequest, NextResponse } from 'next/server';

const PRIVATE_IP_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./i,
  /^https?:\/\/10\./i,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./i,
  /^https?:\/\/192\.168\./i,
  /^https?:\/\/169\.254\./i,
  /^https?:\/\/0\./i,
  /^https?:\/\/::1/i,
  /^https?:\/\/\[::1\]/i,
  /^file:/i,
  /^data:/i,
];

function isPrivateOrInternal(url: string): boolean {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(url));
}

// Dev-only scraper debugging helper. Never expose this in production: it lets
// the caller make the server fetch an arbitrary URL (SSRF), so it's disabled
// outside development and still blocks requests to private/internal addresses.
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const testUrl = request.nextUrl.searchParams.get('url');

  if (!testUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    new URL(testUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  if (!testUrl.startsWith('https://') && !testUrl.startsWith('http://')) {
    return NextResponse.json({ error: 'Only http(s) URLs are allowed' }, { status: 400 });
  }

  if (isPrivateOrInternal(testUrl)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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
