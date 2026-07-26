import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = '7a6f6473c46188721c31804f166eb53d';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');
  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  try {
    // Search for movie
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=de-DE`,
    );
    const searchData = await searchRes.json();
    const movie = searchData.results?.[0];

    if (!movie) {
      return NextResponse.json({ trailer: null });
    }

    // Get videos/trailers
    const videoRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}&language=de-DE`,
    );
    const videoData = await videoRes.json();

    const trailer = videoData.results?.find(
      (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
    ) || videoData.results?.find(
      (v: any) => v.site === 'YouTube'
    );

    if (trailer) {
      return NextResponse.json({ trailer: `https://www.youtube.com/embed/${trailer.key}` });
    }

    return NextResponse.json({ trailer: null });
  } catch {
    return NextResponse.json({ trailer: null });
  }
}
