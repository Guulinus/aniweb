import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/anime.db');

let db: Database.Database | null = null;

// Prepared statement cache
let stmtById: Database.Statement | null = null;
let stmtPopular: Database.Statement | null = null;
let stmtTrending: Database.Statement | null = null;
let stmtSearch: Database.Statement | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { timeout: 5000 });
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000'); // 64MB cache
    db.pragma('temp_store = MEMORY');
    initSchema();
    
    // Pre-compile statements
    stmtById = db.prepare('SELECT * FROM anime WHERE id = ?');
    stmtPopular = db.prepare('SELECT id, title_romaji, title_english, cover_image, banner_image, format, status, episodes, average_score, year FROM anime ORDER BY average_score DESC LIMIT ? OFFSET ?');
    stmtTrending = db.prepare('SELECT id, title_romaji, title_english, cover_image, banner_image, format, status, episodes, average_score, year FROM anime ORDER BY average_score DESC LIMIT ? OFFSET ?');
    stmtSearch = db.prepare('SELECT id, title_romaji, title_english, cover_image, banner_image, format, status, episodes, average_score, year FROM anime WHERE title_romaji LIKE ? OR title_english LIKE ? ORDER BY average_score DESC LIMIT ? OFFSET ?');
  }
  return db;
}

function initSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS anime (
      id INTEGER PRIMARY KEY,
      title_romaji TEXT NOT NULL,
      title_english TEXT,
      title_native TEXT,
      cover_image TEXT,
      banner_image TEXT,
      format TEXT,
      status TEXT,
      episodes INTEGER,
      average_score INTEGER,
      year INTEGER,
      genres TEXT,
      description TEXT,
      episode_thumbnails TEXT,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER
    );
    
    CREATE INDEX IF NOT EXISTS idx_anime_title ON anime(title_romaji);
    CREATE INDEX IF NOT EXISTS idx_anime_score ON anime(average_score);
    CREATE INDEX IF NOT EXISTS idx_anime_year ON anime(year);
  `);
}

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

export function getAnimeById(id: number): AnimeRow | undefined {
  return stmtById?.get(id) as AnimeRow | undefined;
}

export function getPopularAnime(limit = 20, offset = 0): AnimeRow[] {
  const res = stmtPopular?.all(limit, offset);
  return (res as AnimeRow[]) ?? [];
}

export function getTrendingAnime(limit = 20, offset = 0): AnimeRow[] {
  const res = stmtTrending?.all(limit, offset);
  return (res as AnimeRow[]) ?? [];
}

export function searchAnimeDb(query: string, limit = 20, offset = 0): AnimeRow[] {
  const q = `%${query}%`;
  const res = stmtSearch?.all(q, q, limit, offset);
  return (res as AnimeRow[]) ?? [];
}

export function getLastSyncTime(): number | null {
  const row = getDb().prepare('SELECT updated_at FROM sync_meta WHERE key = ?').get('last_sync') as { updated_at: number } | undefined;
  return row?.updated_at ?? null;
}

export function setLastSyncTime(timestamp: number) {
  getDb()
    .prepare('INSERT OR REPLACE INTO sync_meta (key, value, updated_at) VALUES (?, ?, ?)')
    .run('last_sync', '', timestamp);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}