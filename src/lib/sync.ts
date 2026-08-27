import Database from 'better-sqlite3';
import path from 'path';
import { setCacheData, setLastSyncTime } from './animeCache';
import { resolveHqPosters } from './tmdb-client';

const DB_PATH = path.join(process.cwd(), 'data/anime.db');

interface AniListMedia {
  id: number;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { extraLarge: string; large: string; medium: string; color: string | null };
  bannerImage: string | null;
  format: string;
  status: string;
  episodes: number | null;
  averageScore: number | null;
  startDate: { year: number | null };
  genres: string[];
  description: string | null;
  streamingEpisodes: Array<{ title: string; thumbnail: string; episode: number }>;
}

async function fetchAniList(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

function ensureTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS anime (
      id INTEGER PRIMARY KEY,
      title_romaji TEXT NOT NULL,
      title_english TEXT,
      title_native TEXT,
      cover_image TEXT,
      cover_color TEXT,
      banner_image TEXT,
      format TEXT,
      status TEXT,
      episodes INTEGER,
      average_score INTEGER,
      year INTEGER,
      genres TEXT,
      description TEXT,
      episode_thumbnails TEXT,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER);
  `);

  // Migration for databases created before cover_color existed.
  try {
    db.exec('ALTER TABLE anime ADD COLUMN cover_color TEXT');
  } catch {
    // Column already exists.
  }

  // Migration for databases created before the TMDB high-res poster cache existed.
  try {
    db.exec('ALTER TABLE anime ADD COLUMN tmdb_poster TEXT');
  } catch {
    // Column already exists.
  }
}

async function syncPopularAnime(db: Database.Database) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
          id
          title { romaji english native }
          coverImage { extraLarge large medium color }
          bannerImage
          format
          status
          episodes
          averageScore
          startDate { year }
          genres
          description
          streamingEpisodes { thumbnail title }
        }
      }
    }
  `;

  let page = 1;
  let totalSynced = 0;
  const BATCH_SIZE = 50;
  const TARGET = 500;

  while (totalSynced < TARGET) {
    const data = await fetchAniList(query, { page, perPage: BATCH_SIZE });
    const media = data.data?.Page?.media as AniListMedia[];

    if (!media) break;

    // Resolved once here (background sync, runs every 12h) rather than per page-request —
    // this is what lets the popular/trending pages serve the high-res, textless TMDB poster
    // instantly with no per-request TMDB round trip and no low-then-high swap.
    const hqPosters = await resolveHqPosters(
      media.map(m => ({ romaji: m.title.romaji, english: m.title.english, format: m.format }))
    );

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO anime (
        id, title_romaji, title_english, title_native, cover_image, cover_color, banner_image,
        format, status, episodes, average_score, year, genres, description,
        episode_thumbnails, tmdb_poster, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    media.forEach((m, i) => {
      const episodeThumbs: Record<number, string> = {};
      if (m.streamingEpisodes) {
        m.streamingEpisodes.forEach((ep, idx) => {
          if (ep.thumbnail) {
            episodeThumbs[idx + 1] = ep.thumbnail;
          }
        });
      }

      stmt.run(
        m.id,
        m.title.romaji,
        m.title.english ?? null,
        m.title.native ?? null,
        m.coverImage.extraLarge || m.coverImage.large,
        m.coverImage.color ?? null,
        m.bannerImage ?? null,
        m.format ?? null,
        m.status ?? null,
        m.episodes ?? null,
        m.averageScore ?? null,
        m.startDate?.year ?? null,
        JSON.stringify(m.genres ?? []),
        m.description ?? null,
        Object.keys(episodeThumbs).length > 0 ? JSON.stringify(episodeThumbs) : null,
        hqPosters[i] ?? null,
        Math.floor(Date.now() / 1000)
      );
      totalSynced++;
    });

    if (!data.data?.Page?.pageInfo?.hasNextPage) break;
    page++;
  }

  return totalSynced;
}

export function loadCacheFromDb() {
  try {
    const db = openDb();
    ensureTables(db);
    const rows = db.prepare('SELECT * FROM anime').all() as any[];
    db.close();

    if (rows.length > 0) {
      setCacheData(rows);
    }
    return rows.length;
  } catch (err) {
    console.error('Failed to load cache from DB:', err);
    return 0;
  }
}

export async function syncDatabase() {
  console.log('[Sync] Starting database sync...');
  const start = Date.now();

  try {
    const db = openDb();
    ensureTables(db);
    const count = await syncPopularAnime(db);

    const now = Math.floor(Date.now() / 1000);
    db.prepare('INSERT OR REPLACE INTO sync_meta (key, value, updated_at) VALUES (?, ?, ?)')
      .run('last_sync', '', now);

    setLastSyncTime(now);
    db.close();

    loadCacheFromDb();

    console.log(`[Sync] Complete: ${count} anime synced in ${(Date.now() - start) / 1000}s`);
    return count;
  } catch (err) {
    console.error('[Sync] Failed:', err);
    throw err;
  }
}

export function getLastSyncFromDb(): number | null {
  try {
    const db = openDb();
    ensureTables(db);
    const row = db.prepare('SELECT updated_at FROM sync_meta WHERE key = ?').get('last_sync') as { updated_at: number } | undefined;
    db.close();
    return row?.updated_at ?? null;
  } catch {
    return null;
  }
}

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startBackgroundSync() {
  if (syncInterval) return;

  const cached = loadCacheFromDb();
  console.log(`[Sync] Loaded ${cached} anime from cache on startup`);

  const lastSync = getLastSyncFromDb();
  const now = Math.floor(Date.now() / 1000);
  const twelveHours = 12 * 60 * 60;

  if (!lastSync || now - lastSync > twelveHours) {
    syncDatabase().catch(err => {
      console.error('[Sync] Background sync failed:', err);
    });
  }

  syncInterval = setInterval(() => {
    syncDatabase().catch(err => {
      console.error('[Sync] Periodic sync failed:', err);
    });
  }, twelveHours * 1000);
}

export function stopBackgroundSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
