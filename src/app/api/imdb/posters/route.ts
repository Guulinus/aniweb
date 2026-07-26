import { NextRequest, NextResponse } from 'next/server';

interface ImdbItem {
  id: number;
  title: string;
  year?: number | null;
}

async function searchImdbPoster(title: string, year?: number | null): Promise<string | null> {
  try {
    const letter = encodeURIComponent(title[0]?.toLowerCase() || 'a');
    const query = encodeURIComponent(title);
    const res = await fetch(`https://v3.sg.media-imdb.com/suggestion/${letter}/${query}.json`, {
      next: { revalidate: 604800 },
    });
    const data = await res.json();

    const tvResults = (data.d ?? []).filter(
      (item: any) => item.qid === 'tvSeries' || item.qid === 'tvMiniSeries'
    );

    const best = tvResults[0] ?? data.d?.[0];
    if (!best?.i?.imageUrl) return null;

    const fullUrl: string = best.i.imageUrl;
    const sx500Url = fullUrl.replace(/\._V1_\.jpg$/, '._V1_SX500.jpg').replace(/_V1_\.jpg$/, '_V1_SX500.jpg');
    return sx500Url;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const itemsParam = request.nextUrl.searchParams.get('items');
  if (!itemsParam) return NextResponse.json({ posters: {} });

  let items: ImdbItem[];
  try {
    items = JSON.parse(itemsParam);
  } catch {
    return NextResponse.json({ posters: {} });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ posters: {} });
  }

  const posters: Record<number, string> = {};

  await Promise.allSettled(
    items.map(async (item) => {
      if (!item.title) return;
      const poster = await searchImdbPoster(item.title, item.year);
      if (poster) posters[item.id] = poster;
    })
  );

  return NextResponse.json({ posters }, {
    headers: { 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000' },
  });
}
