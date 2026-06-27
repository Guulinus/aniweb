'use client';

const POSITION_PREFIX = 'watchPosition:';
const WATCHLIST_KEY = 'watchlist';

interface PositionData {
  key: string;
  animeId: number;
  slug: string;
  season: number;
  episode: number;
  time: number;
  duration: number;
  updatedAt: number;
}

interface SyncPayload {
  watchlist: any[];
  positions: PositionData[];
  history: any[];
  ratings?: Record<string, number>;
  settings?: Record<string, unknown>;
}

function getAllPositions(): PositionData[] {
  const positions: PositionData[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(POSITION_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const parts = key.replace(POSITION_PREFIX, '').split(':');
      positions.push({
        key,
        animeId: parseInt(parts[0]) || 0,
        slug: parts[1] || '',
        season: parseInt(parts[2]) || 1,
        episode: parseInt(parts[3]) || 1,
        time: data.time || 0,
        duration: data.duration || 0,
        updatedAt: data.updatedAt || Date.now(),
      });
    } catch {}
  }
  return positions;
}

function getWatchlist(): any[] {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function applyMergedData(data: SyncPayload) {
  // Write merged watchlist
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(data.watchlist || []));

  // Write merged positions
  const currentKeys = new Set<string>();
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(POSITION_PREFIX)) currentKeys.add(k);
  }
  for (const pos of data.positions || []) {
    localStorage.setItem(pos.key, JSON.stringify({
      time: pos.time,
      duration: pos.duration,
      updatedAt: pos.updatedAt,
    }));
    currentKeys.delete(pos.key);
  }
  // Remove positions that are no longer in merged data
  for (const staleKey of currentKeys) {
    localStorage.removeItem(staleKey);
  }

  // Write merged ratings
  if (data.ratings) {
    localStorage.setItem('ratings', JSON.stringify(data.ratings));
  }

  // Write merged settings
  if (data.settings) {
    localStorage.setItem('anirollSettings', JSON.stringify(data.settings));
  }
}

function getRatings(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem('ratings') ?? '{}');
  } catch { return {}; }
}

function getSettings(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem('anirollSettings') ?? '{}');
  } catch { return {}; }
}

export async function syncAfterLogin(): Promise<void> {
  try {
    const positions = getAllPositions();
    const watchlist = getWatchlist();
    const ratings = getRatings();
    const settings = getSettings();

    const res = await fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        watchlist,
        positions,
        history: [],
        ratings,
        settings,
      } satisfies SyncPayload),
    });

    if (res.ok) {
      const body = await res.json();
      if (body.data) {
        applyMergedData(body.data);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync-complete'));
    }
  } catch (err) {
    console.error('Sync after login failed:', err);
  }
}

export async function pushServerData(): Promise<void> {
  try {
    const positions = getAllPositions();
    const watchlist = getWatchlist();
    const ratings = getRatings();
    const settings = getSettings();
    fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchlist, positions, history: [], ratings, settings } satisfies SyncPayload),
    }).catch(() => {});
  } catch {}
}

export async function pullServerData(): Promise<void> {
  try {
    const res = await fetch('/api/user/sync');
    if (!res.ok) return;
    const data: SyncPayload = await res.json();
    if (data) {
      applyMergedData(data);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync-complete'));
    }
  } catch (err) {
    console.error('Sync pull failed:', err);
  }
}
