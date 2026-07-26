import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = '7a6f6473c46188721c31804f166eb53d';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

async function searchPoster(title: string, year?: number | null): Promise<string | null> {
  try {
    let url = `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=de-DE`;
    if (year) url += `&year=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    const show = data.results?.[0];
    if (!show?.poster_path) return null;
    return `${TMDB_IMG}${show.poster_path}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids');
  if (!ids) return NextResponse.json({ posters: {} });

  const items = JSON.parse(ids);
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ posters: {} });
  }

  const posters: Record<number, string> = {};

  const results = await Promise.allSettled(
    items.map(async (item: { id: number; romaji?: string; english?: string; year?: number | null }) => {
      const title = item.english || item.romaji;
      if (!title) return null;
      const poster = await searchPoster(title, item.year);
      if (poster) posters[item.id] = poster;
      return null;
    })
  );

  return NextResponse.json({ posters }, {
    headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
  });
}
