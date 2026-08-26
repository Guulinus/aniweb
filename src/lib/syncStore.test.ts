import { describe, it, expect } from 'vitest';
import { mergeSync } from './syncStore';

const empty = () => ({ watchlist: [], positions: [], history: [] });

describe('mergeSync — watchlist', () => {
  it('keeps the newer entry per animeId', () => {
    const server = { ...empty(), watchlist: [{ animeId: 1, lastWatched: 100, title: 'old' }] };
    const client = { ...empty(), watchlist: [{ animeId: 1, lastWatched: 200, title: 'new' }] };
    const merged = mergeSync(server, client);
    expect(merged.watchlist).toEqual([{ animeId: 1, lastWatched: 200, title: 'new' }]);
  });

  it('keeps the server entry when it is newer than the client entry', () => {
    const server = { ...empty(), watchlist: [{ animeId: 1, lastWatched: 200, title: 'server' }] };
    const client = { ...empty(), watchlist: [{ animeId: 1, lastWatched: 100, title: 'client' }] };
    const merged = mergeSync(server, client);
    expect(merged.watchlist).toEqual([{ animeId: 1, lastWatched: 200, title: 'server' }]);
  });

  it('unions entries for different animeIds', () => {
    const server = { ...empty(), watchlist: [{ animeId: 1, addedAt: 100 }] };
    const client = { ...empty(), watchlist: [{ animeId: 2, addedAt: 100 }] };
    const merged = mergeSync(server, client);
    expect(merged.watchlist.map(e => e.animeId).sort()).toEqual([1, 2]);
  });
});

describe('mergeSync — positions', () => {
  it('keeps the position with the higher updatedAt per key', () => {
    const server = { ...empty(), positions: [{ key: 'a:1:1', updatedAt: 10, seconds: 30 }] };
    const client = { ...empty(), positions: [{ key: 'a:1:1', updatedAt: 20, seconds: 90 }] };
    const merged = mergeSync(server, client);
    expect(merged.positions).toEqual([{ key: 'a:1:1', updatedAt: 20, seconds: 90 }]);
  });
});

describe('mergeSync — history', () => {
  it('deduplicates identical entries and unions distinct ones', () => {
    const entry = { animeId: 1, episode: 1, watchedAt: 100 };
    const server = { ...empty(), history: [entry] };
    const client = { ...empty(), history: [entry, { animeId: 2, episode: 1, watchedAt: 200 }] };
    const merged = mergeSync(server, client);
    expect(merged.history).toHaveLength(2);
  });
});

describe('mergeSync — ratings and settings', () => {
  it('merges ratings with client overriding on conflicts', () => {
    const server = { ...empty(), ratings: { '1': 5, '2': 8 } };
    const client = { ...empty(), ratings: { '2': 9, '3': 7 } };
    const merged = mergeSync(server, client);
    expect(merged.ratings).toEqual({ '1': 5, '2': 9, '3': 7 });
  });

  it('lets client settings win entirely when present', () => {
    const server = { ...empty(), settings: { theme: 'server-theme' } };
    const client = { ...empty(), settings: { theme: 'client-theme' } };
    const merged = mergeSync(server, client);
    expect(merged.settings).toEqual({ theme: 'client-theme' });
  });

  it('falls back to server settings when client has none', () => {
    const server = { ...empty(), settings: { theme: 'server-theme' } };
    const client = empty();
    const merged = mergeSync(server, client);
    expect(merged.settings).toEqual({ theme: 'server-theme' });
  });
});
