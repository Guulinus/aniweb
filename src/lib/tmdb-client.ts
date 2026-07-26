const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = '7a6f6473c46188721c31804f166eb53d';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';

export interface TmdbMovie {
  title: string;
  slug: string;
  posterImage: string;
  year: number | null;
}

export async function searchTmdbMovie(query: string): Promise<TmdbMovie[]> {
  try {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=de-DE`
    );
    const data = await res.json();

    return (data.results ?? []).slice(0, 10).map((m: any) => ({
      title: m.title || m.original_title,
      slug: (m.title || m.original_title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      posterImage: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : '',
      year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : null,
    }));
  } catch {
    return [];
  }
}

export async function getTmdbMovieTrailer(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=de-DE`
    );
    const data = await res.json();
    const movie = data.results?.[0];
    if (!movie) return null;

    const videoRes = await fetch(
      `${TMDB_BASE}/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}&language=de-DE`
    );
    const videoData = await videoRes.json();
    const trailer = videoData.results?.find(
      (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
    ) || videoData.results?.find(
      (v: any) => v.site === 'YouTube'
    );

    return trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;
  } catch {
    return null;
  }
}

export async function searchTmdbId(romaji: string, english?: string | null): Promise<number | null> {
  for (const title of [romaji, english].filter(Boolean) as string[]) {
    try {
      const res = await fetch(
        `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=de-DE`
      );
      const data = await res.json();
      if (data.results?.length > 0) {
        return data.results[0].id;
      }
    } catch {}
  }
  return null;
}

export async function getTmdbSeasonThumbnails(tmdbId: number, seasons: number[]): Promise<Record<number, Record<number, string>>> {
  const thumbnails: Record<number, Record<number, string>> = {};

  for (const seasonNum of seasons) {
    try {
      const res = await fetch(
        `${TMDB_BASE}/tv/${tmdbId}/season/${seasonNum}?api_key=${TMDB_API_KEY}&language=de-DE`
      );
      const data = await res.json();
      if (data.episodes?.length > 0) {
        const epThumbs: Record<number, string> = {};
        for (const ep of data.episodes) {
          if (ep.still_path) {
            epThumbs[ep.episode_number] = `${TMDB_IMG_BASE}${ep.still_path}`;
          }
        }
        if (Object.keys(epThumbs).length > 0) {
          thumbnails[seasonNum] = epThumbs;
        }
      }
    } catch {}
  }

  return thumbnails;
}
