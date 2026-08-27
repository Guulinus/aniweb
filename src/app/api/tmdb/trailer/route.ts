import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = '7a6f6473c46188721c31804f166eb53d';
const TMDB_BASE = 'https://api.themoviedb.org/3';

function findYoutubeTrailer(results: any[]): { key: string } | undefined {
  return results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
    || results?.find((v: any) => v.type === 'Teaser' && v.site === 'YouTube')
    || results?.find((v: any) => v.site === 'YouTube');
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');
  const year = request.nextUrl.searchParams.get('year');
  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  try {
    const searchParams = new URLSearchParams({
      api_key: TMDB_API_KEY,
      query,
      language: 'de-DE',
    });
    if (year) searchParams.set('primary_release_year', year);

    const searchRes = await fetch(`${TMDB_BASE}/search/movie?${searchParams}`);
    const searchData = await searchRes.json();
    let movie = searchData.results?.[0];

    // A wrong release year still shouldn't block a match — retry without it before giving up.
    if (!movie && year) {
      searchParams.delete('primary_release_year');
      const retryRes = await fetch(`${TMDB_BASE}/search/movie?${searchParams}`);
      const retryData = await retryRes.json();
      movie = retryData.results?.[0];
    }

    if (!movie) {
      return NextResponse.json({ trailer: null });
    }

    // TMDB videos are mostly tagged in English even for foreign films — try German first,
    // then fall back to the untranslated (default) video list before giving up.
    const videoResDe = await fetch(`${TMDB_BASE}/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}&language=de-DE`);
    const videoDataDe = await videoResDe.json();
    let trailer = findYoutubeTrailer(videoDataDe.results);

    if (!trailer) {
      const videoRes = await fetch(`${TMDB_BASE}/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}`);
      const videoData = await videoRes.json();
      trailer = findYoutubeTrailer(videoData.results);
    }

    if (trailer) {
      return NextResponse.json({ trailer: `https://www.youtube.com/embed/${trailer.key}` });
    }

    return NextResponse.json({ trailer: null });
  } catch {
    return NextResponse.json({ trailer: null });
  }
}
