// Simple in-memory database for TV build
// Uses cached data instead of SQLite for compatibility

const cache = new Map<number, any>();
const popularCache: any[] = [];
const searchCache = new Map<string, any[]>();

export interface AnimeRow {
  id: number;
  title_romaji: string;
  title_english: string | null;
  title_native: string | null;
  cover_image: string;
  banner_image: string | null;
  format: string;
  status: string;
  episodes: number | null;
  average_score: number | null;
  year: number | null;
  genres: string;
  description: string | null;
  episode_thumbnails: string | null;
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