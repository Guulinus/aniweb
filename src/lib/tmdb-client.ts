const TMDB_API = 'https://api.themoviedb.org/3';
export const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';

export type TmdbSeasonThumbnails = Record<number, Record<number, string>>;

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY environment variable not set');
  return key;
}

async function tmdbFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(
      `${TMDB_API}${path}${path.includes('?') ? '&' : '?'}api_key=${getApiKey()}&language=de-DE`,
      { cache: 'no-store', signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

interface TmdbSearchResult {
  id: number;
  name: string;
  first_air_date: string | null;
}

interface TmdbEpisode {
  episode_number: number;
  still_path: string | null;
  name: string;
}

interface TmdbSeasonResult {
  episodes: TmdbEpisode[] | null;
}

function buildSearchQueries(title: string): string[] {
  const queries: string[] = [title];
  const cleaned = title.replace(/\s*\([^)]*\)\s*/g, '').trim();
  if (cleaned !== title) queries.push(cleaned);
  const primary = title.split(/[-:]/)[0].trim();
  if (primary !== title) queries.push(primary);
  return [...new Set(queries)];
}

export async function searchTmdbId(romajiTitle: string, englishTitle?: string | null): Promise<number | null> {
  const allTitles = buildSearchQueries(romajiTitle);
  if (englishTitle) allTitles.push(...buildSearchQueries(englishTitle));

  for (const query of allTitles) {
    if (query.length < 2) continue;
    const result = await tmdbFetch<{ results: TmdbSearchResult[] }>(
      `/search/tv?query=${encodeURIComponent(query)}`
    );
    if (result?.results?.length) {
      return result.results[0].id;
    }
  }
  return null;
}

export async function getTmdbSeasonThumbnails(
  tmdbId: number,
  seasonNumbers: number[]
): Promise<TmdbSeasonThumbnails> {
  const result: TmdbSeasonThumbnails = {};

  await Promise.all(
    seasonNumbers.map(async (sn) => {
      const seasonData = await tmdbFetch<TmdbSeasonResult>(
        `/tv/${tmdbId}/season/${sn}`
      );
      if (seasonData?.episodes) {
        const epThumbs: Record<number, string> = {};
        for (const ep of seasonData.episodes) {
          if (ep.still_path) {
            epThumbs[ep.episode_number] = TMDB_IMG_BASE + ep.still_path;
          }
        }
        if (Object.keys(epThumbs).length > 0) {
          result[sn] = epThumbs;
        }
      }
    })
  );

  return result;
}
