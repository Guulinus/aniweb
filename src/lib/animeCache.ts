// In-memory read cache for the AniList anime catalog.
//
// This is NOT the database itself — it's a fast lookup layer in front of the
// real SQLite database (`data/anime.db`). `src/lib/sync.ts` populates it via
// `setCacheData()` on startup (`loadCacheFromDb()`) and every 12h
// (`syncDatabase()`). Querying SQLite directly on every request would be
// fine too, but this avoids repeated disk reads for hot paths like the
// homepage. If the process restarts, `loadCacheFromDb()` refills this from
// `anime.db`, so data is not actually lost — only the in-memory cache is.

const cache = new Map<number, any>();
const popularCache: any[] = [];
const searchCache = new Map<string, any[]>();

export interface AnimeRow {
  id: number;
  title_romaji: string;
  title_english: string | null;
  title_native: string | null;
  cover_image: string;
  cover_color: string | null;
  banner_image: string | null;
  format: string;
  status: string;
  episodes: number | null;
  average_score: number | null;
  year: number | null;
  genres: string;
  description: string | null;
  episode_thumbnails: string | null;
  tmdb_poster: string | null;
  updated_at: number;
}

export function getDb() {
  return {
    prepare: (sql: string) => ({
      get: (...args: any[]) => {
        if (sql.includes('FROM anime WHERE id = ?')) {
          return cache.get(args[0]);
        }
        if (sql.includes('FROM sync_meta')) {
          return null;
        }
        return undefined;
      },
      all: (...args: any[]) => {
        if (sql.includes('ORDER BY average_score DESC')) {
          return popularCache.slice(args[1] || 0, (args[1] || 0) + (args[0] || 20));
        }
        if (sql.includes('title_romaji LIKE')) {
          const q = args[0].toLowerCase();
          return Array.from(cache.values()).filter((a: AnimeRow) =>
            a.title_romaji.toLowerCase().includes(q) ||
            (a.title_english && a.title_english.toLowerCase().includes(q))
          ).slice(args[2] || 0, (args[2] || 0) + (args[0] || 20));
        }
        return [];
      },
      run: () => {}
    }),
    exec: () => {},
    close: () => {}
  };
}

export function setCacheData(data: any[]) {
  data.forEach((anime: any) => {
    cache.set(anime.id, anime);
  });
  popularCache.length = 0;
  popularCache.push(...data.sort((a: any, b: any) => (b.averageScore || 0) - (a.averageScore || 0)));
}

export function getAnimeById(id: number): AnimeRow | undefined {
  return cache.get(id);
}

export function getAnimeByIdDb(id: number): AnimeRow | undefined {
  return cache.get(id);
}

export function getPopularAnime(limit = 20, offset = 0): AnimeRow[] {
  return popularCache.slice(offset, offset + limit);
}

export function getTrendingAnime(limit = 20, offset = 0): AnimeRow[] {
  return popularCache.slice(offset, offset + limit);
}

export function searchAnimeDb(query: string, limit = 20, offset = 0): AnimeRow[] {
  const q = query.toLowerCase();
  const results = Array.from(cache.values()).filter((a: AnimeRow) =>
    a.title_romaji.toLowerCase().includes(q) ||
    (a.title_english && a.title_english.toLowerCase().includes(q))
  );
  return results.slice(offset, offset + limit);
}

let lastSyncTime: number | null = null;

export function getLastSyncTime(): number | null { return lastSyncTime; }
export function setLastSyncTime(timestamp: number) { lastSyncTime = timestamp; }
export function closeDb() {}

export default {};
