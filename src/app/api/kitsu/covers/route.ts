import { NextRequest, NextResponse } from 'next/server';

const titleCache = new Map<string, { url: string | null; ts: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const animeId = request.nextUrl.searchParams.get('animeId');
  const title = request.nextUrl.searchParams.get('title');

  if (!animeId && !title) {
    return NextResponse.json({ error: 'Missing animeId or title' }, { status: 400 });
  }

  try {
    let searchTitle = title;

    if (!searchTitle && animeId) {
      const cached = titleCache.get(`anilist:${animeId}`);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return NextResponse.json({ coverUrl: cached.url });
      }

      const anilistRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query ($id: Int) { Media(id: $id, type: ANIME) { title { romaji english } } }`,
          variables: { id: parseInt(animeId) }
        })
      });
      const anilistData = await anilistRes.json();
      searchTitle = anilistData?.data?.Media?.title?.english || anilistData?.data?.Media?.title?.romaji;
    }

    if (!searchTitle) {
      return NextResponse.json({ coverUrl: null });
    }

    const kitsuRes = await fetch(
      `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(searchTitle)}&page[limit]=1&fields[anime]=posterImage`,
      { headers: { 'Accept': 'application/vnd.api+json' } }
    );
    const kitsuData = await kitsuRes.json();
    const poster = kitsuData?.data?.[0]?.attributes?.posterImage;
    const coverUrl = poster?.large ?? poster?.original ?? null;

    if (animeId) titleCache.set(`anilist:${animeId}`, { url: coverUrl, ts: Date.now() });

    return NextResponse.json({ coverUrl });
  } catch {
    return NextResponse.json({ coverUrl: null });
  }
}
