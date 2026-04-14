import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/anime.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

interface AniListMedia {
  id: number;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { large: string; medium: string };
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

async function fetchAniList(query: string, variables: Record<string, any> = {}) {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function syncPopularAnime() {
  console.log('Syncing popular anime...');

  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, sort: [POPULARITY_DESC, SCORE_DESC], isAdult: false) {
          id
          title { romaji english native }
          coverImage { large medium }
          bannerImage
          format
          status
          episodes
          averageScore
          startDate { year }
          genres
          description
          streamingEpisodes { title thumbnail episode }
        }
      }
    }
  `;

  let page = 1;
  let totalSynced = 0;
  const BATCH_SIZE = 50;
  const TARGET = 500;

  while (totalSynced < TARGET) {
    console.log(`Fetching page ${page}...`);
    
    const data = await fetchAniList(query, { page, perPage: BATCH_SIZE });
    const media = data.data?.Page?.media as AniListMedia[];

    if (!media) break;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO anime (
        id, title_romaji, title_english, title_native, cover_image, banner_image,
        format, status, episodes, average_score, year, genres, description, 
        episode_thumbnails, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const m of media) {
      const episodeThumbs: Record<number, string> = {};
      if (m.streamingEpisodes) {
        for (const ep of m.streamingEpisodes) {
          if (ep.thumbnail && ep.episode) {
            episodeThumbs[ep.episode] = ep.thumbnail;
          }
        }
      }
      
      stmt.run(
        m.id,
        m.title.romaji,
        m.title.english ?? null,
        m.title.native ?? null,
        m.coverImage.large,
        m.bannerImage ?? null,
        m.format ?? null,
        m.status ?? null,
        m.episodes ?? null,
        m.averageScore ?? null,
        m.startDate?.year ?? null,
        JSON.stringify(m.genres ?? []),
        m.description ?? null,
        Object.keys(episodeThumbs).length > 0 ? JSON.stringify(episodeThumbs) : null,
        Math.floor(Date.now() / 1000)
      );
      totalSynced++;
    }

    console.log(`Synced ${totalSynced}/${TARGET}`);
    if (!data.data?.Page?.pageInfo?.hasNextPage) break;
    page++;
  }

  console.log(`Done: ${totalSynced} anime`);
  return totalSynced;
}

async function main() {
  console.log('Starting sync...');
  const start = Date.now();

  db.exec(`
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
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER);
  `);

  await syncPopularAnime();

  db.prepare('INSERT OR REPLACE INTO sync_meta (key, value, updated_at) VALUES (?, ?, ?)')
    .run('last_sync', '', Math.floor(Date.now() / 1000));

  console.log(`Sync complete in ${(Date.now() - start) / 1000}s`);
  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });