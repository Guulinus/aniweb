// Per-user watchlist/history/position sync: file storage + merge logic.
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');

interface SyncData {
  watchlist: any[];
  positions: any[];
  history: any[];
  ratings?: Record<string, number>;
  settings?: Record<string, unknown>;
}

export function readUserData(userId: number): SyncData {
  const file = path.join(DATA_DIR, `user_${userId}.json`);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch {}
  return { watchlist: [], positions: [], history: [] };
}

function writeUserData(userId: number, data: SyncData) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, `user_${userId}.json`), JSON.stringify(data));
  } catch (err) {
    console.error('Error writing user data:', err);
  }
}

export function getSyncData(userId: number): SyncData {
  return readUserData(userId);
}

export function putSyncData(userId: number, data: SyncData) {
  writeUserData(userId, data);
}

// Pure merge logic, isolated from file I/O so it can be unit tested directly.
export function mergeSync(server: SyncData, client: SyncData): SyncData {
  const watchlistMap = new Map<number, any>();
  for (const e of server.watchlist) watchlistMap.set(e.animeId, e);
  for (const e of client.watchlist) {
    const existing = watchlistMap.get(e.animeId);
    if (!existing || (e.lastWatched || e.addedAt) > (existing.lastWatched || existing.addedAt)) {
      watchlistMap.set(e.animeId, e);
    }
  }
  const mergedWatchlist = Array.from(watchlistMap.values());

  const posMap = new Map<string, any>();
  for (const p of server.positions) posMap.set(p.key, p);
  for (const p of client.positions) {
    const existing = posMap.get(p.key);
    if (!existing || (p.updatedAt || 0) > (existing.updatedAt || 0)) {
      posMap.set(p.key, p);
    }
  }
  const mergedPositions = Array.from(posMap.values());

  const historySet = new Set(server.history.map((h: any) => JSON.stringify(h)));
  for (const h of client.history) {
    historySet.add(JSON.stringify(h));
  }
  const mergedHistory = Array.from(historySet).map((s: string) => JSON.parse(s));

  const mergedRatings = { ...(server.ratings || {}), ...(client.ratings || {}) };

  // Settings: client wins entirely (latest device config)
  const mergedSettings = client.settings || server.settings || {};

  return {
    watchlist: mergedWatchlist,
    positions: mergedPositions,
    history: mergedHistory,
    ratings: mergedRatings,
    settings: mergedSettings,
  };
}

export function mergeSyncData(userId: number, client: SyncData): SyncData {
  const server = readUserData(userId);
  const merged = mergeSync(server, client);
  writeUserData(userId, merged);
  return merged;
}
