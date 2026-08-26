const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = '7a6f6473c46188721c31804f166eb53d';
// w780 for posters/banners (large display size), w500 for small episode stills.
const TMDB_IMG_POSTER = 'https://image.tmdb.org/t/p/w780';
const TMDB_IMG_STILL = 'https://image.tmdb.org/t/p/w500';

export interface TmdbMovie {
  title: string;
  slug: string;
  posterImage: string;
  year: number | null;
}

export interface TmdbFilmInfo {
  title: string;
  posterImage: string;
  runtimeMinutes: number | null;
  year: number | null;
}

export async function getTmdbFilmInfo(title: string): Promise<TmdbFilmInfo | null> {
  try {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=de-DE`
    );
    const data = await res.json();
    const movie = data.results?.find((m: any) => m.title && !m.adult) ?? data.results?.[0];
    if (!movie) return null;

    let runtime: number | null = null;
    try {
      const detailRes = await fetch(
        `${TMDB_BASE}/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=de-DE`
      );
      const detail = await detailRes.json();
      runtime = detail.runtime && detail.runtime > 0 ? detail.runtime : null;
    } catch {}

    return {
      title: movie.title || movie.original_title,
      posterImage: movie.poster_path ? `${TMDB_IMG_POSTER}${movie.poster_path}` : '',
      runtimeMinutes: runtime,
      year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
    };
  } catch {
    return null;
  }
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
      posterImage: m.poster_path ? `${TMDB_IMG_POSTER}${m.poster_path}` : '',
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
  // Trailing disambiguation markers like "(TV)" (used by AniList when multiple
  // entries share a title) don't exist on TMDB and make the search return zero
  // results, so strip them before querying.
  const clean = (t: string) => t.replace(/\s*\((?:TV|OVA|ONA|Movie|Special)\)\s*$/i, '').trim();
  // English titles are far more likely to exactly match TMDB's (usually English) show
  // titles than romaji, so try both languages verbatim first and only fall back to the
  // stripped versions afterward — otherwise a cleaned romaji title can match an unrelated
  // show (e.g. a spin-off/sequel sharing the same base name) before the correct English
  // match is even attempted.
  const titles = [english, romaji].filter(Boolean) as string[];
  const candidates = Array.from(new Set([...titles, ...titles.map(clean)]));

  for (const title of candidates) {
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

export interface TmdbSeasonName {
  seasonNumber: number;
  name: string;
}

// TMDB season names often carry the arc/cour title (e.g. "Stardust Crusaders",
// "Diamond is Unbreakable") for franchises AniWorld groups into one page with
// numbered seasons — used to figure out which AniWorld season a specific
// AniList entry (which has its own arc-named title, not a "Season N" label)
// actually corresponds to.
export async function getTmdbShowSeasons(tmdbId: number): Promise<TmdbSeasonName[]> {
  try {
    const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
    const data = await res.json();
    if (!Array.isArray(data.seasons)) return [];
    return data.seasons
      .filter((s: any) => s.season_number > 0)
      .map((s: any) => ({ seasonNumber: s.season_number, name: s.name as string }));
  } catch {
    return [];
  }
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
            epThumbs[ep.episode_number] = `${TMDB_IMG_STILL}${ep.still_path}`;
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
