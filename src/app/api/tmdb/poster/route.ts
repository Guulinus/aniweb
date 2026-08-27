import { NextRequest, NextResponse } from 'next/server';
import { searchTmdbIdStrict, getTmdbPoster } from '@/lib/tmdb-client';

const TMDB_API_KEY = '7a6f6473c46188721c31804f166eb53d';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG_POSTER_XL = 'https://image.tmdb.org/t/p/original';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function looksLikeMatch(result: { title?: string; original_title?: string }, candidates: string[]): boolean {
  const resultTitles = [result.title, result.original_title].filter(Boolean).map(t => normalize(t as string));
  return candidates.some(c => {
    const nc = normalize(c);
    return nc.length >= 3 && resultTitles.some(rt => rt === nc || rt.includes(nc) || nc.includes(rt));
  });
}

// Only used for the anime detail page's single hero poster — a much higher-resolution,
// "zoomable" image than AniList's own ~460x690 cover, but only shown when we're confident
// it's actually the right title (see tmdb-client.ts for why that check exists).
export async function GET(request: NextRequest) {
  const romaji = request.nextUrl.searchParams.get('romaji');
  const english = request.nextUrl.searchParams.get('english');
  const format = request.nextUrl.searchParams.get('format') === 'MOVIE' ? 'movie' : 'tv';

  if (!romaji && !english) {
    return NextResponse.json({ poster: null });
  }

  try {
    if (format === 'movie') {
      const candidates = [english, romaji].filter(Boolean) as string[];
      for (const title of candidates) {
        const res = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=de-DE`);
        const data = await res.json();
        const match = (data.results ?? []).slice(0, 5).find((m: any) => looksLikeMatch(m, candidates));
        if (match?.poster_path) {
          return NextResponse.json({ poster: `${TMDB_IMG_POSTER_XL}${match.poster_path}` });
        }
      }
      return NextResponse.json({ poster: null });
    }

    const tmdbId = await searchTmdbIdStrict(romaji ?? '', english);
    if (!tmdbId) return NextResponse.json({ poster: null });
    const poster = await getTmdbPoster(tmdbId, 'tv');
    return NextResponse.json({ poster });
  } catch {
    return NextResponse.json({ poster: null });
  }
}
