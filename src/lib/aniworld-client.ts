import { AniworldClient } from 'aniworld.ts';
import NodeCache from 'node-cache';
import type { AniworldSeason, StreamLink } from '@/types';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

const aniworld = new AniworldClient({
  hostUrl: 'https://aniworld.to',
  site: 'anime',
  cache,
});

export async function searchAniworld(query: string) {
  try {
    return await aniworld.search(query);
  } catch {
    return [];
  }
}

export async function getAniworldSeries(slug: string) {
  try {
    return await aniworld.getSeries(slug);
  } catch {
    return null;
  }
}

export async function getAniworldSeasons(slug: string): Promise<AniworldSeason[]> {
  try {
    const series = await aniworld.getSeries(slug);
    if (!series) return [];

    const seasons: AniworldSeason[] = [];
    const seasonCount = series.seasonsCount ?? 0;

    for (let i = 1; i <= seasonCount; i++) {
      const season = await aniworld.getSeason(slug, i);
      if (season) {
        seasons.push({
          seasonNumber: season.seasonNumber,
          episodes: season.episodes.map((ep) => ({
            number: ep.episodeNumber,
            title: ep.title ?? `Episode ${ep.episodeNumber}`,
            slug: '',
          })),
        });
      }
    }

    // Also check for movies (season 0)
    try {
      const movies = await aniworld.getMovies(slug);
      if (movies && movies.episodes?.length > 0) {
        seasons.push({
          seasonNumber: 0,
          episodes: movies.episodes.map((ep) => ({
            number: ep.episodeNumber,
            title: ep.title ?? `Movie ${ep.episodeNumber}`,
            slug: '',
          })),
        });
      }
    } catch {
      // No movies available, skip
    }

    return seasons;
  } catch {
    return [];
  }
}

export async function getEpisodeStreamLinks(slug: string, season: number, episode: number): Promise<StreamLink[]> {
  try {
    const episodeData = await aniworld.getEpisode(slug, season, episode);
    if (!episodeData) return [];

    // Filter for German audio only
    const germanLinks: StreamLink[] = [];
    for (const media of episodeData.media) {
      if (media.audio === 'german') {
        germanLinks.push({
          hoster: media.hoster,
          url: media.url,
        });
      }
    }

    return germanLinks;
  } catch {
    return [];
  }
}
