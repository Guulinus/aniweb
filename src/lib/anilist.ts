import type { AnimeBasic, AnimeDetail, SearchResponse, BrowseResponse } from '@/types';
import { resolveHqPoster, resolveHqPosters } from './tmdb-client';

const ANILIST_API = 'https://graphql.anilist.co';

async function anilistQuery<T>(query: string, variables?: Record<string, unknown>, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 300 },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.errors?.length > 0) {
        throw new Error(`AniList GraphQL error: ${data.errors[0].message}`);
      }
      return data.data;
    }

    if (response.status === 429 && attempt < retries) {
      const delay = attempt * 2000;
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    throw new Error(`AniList API error: ${response.status}`);
  }

  throw new Error('AniList API error: max retries exceeded');
}

function mapMediaToBasic(media: any): AnimeBasic {
  return {
    id: media.id,
    idMal: media.idMal ?? null,
    title: {
      romaji: media.title?.romaji ?? '',
      english: media.title?.english ?? null,
      native: media.title?.native ?? null,
    },
    coverImage: {
      large: media.coverImage?.extraLarge ?? media.coverImage?.large ?? '',
      medium: media.coverImage?.large ?? media.coverImage?.medium ?? '',
      color: media.coverImage?.color ?? null,
    },
    bannerImage: media.bannerImage ?? null,
    format: media.format ?? 'UNKNOWN',
    status: media.status ?? 'UNKNOWN',
    episodes: media.episodes ?? null,
    averageScore: media.averageScore ?? null,
    year: media.startDate?.year ?? null,
    genres: media.genres ?? [],
    description: media.description ?? null,
    episodeThumbnails: null,
  };
}

// Resolves the higher-resolution, textless TMDB poster for a page of results in one batch —
// used for the live AniList list endpoints so results still ship with the good poster already
// in place (no swap after the fact), the same way the DB-backed hot paths get it for free from
// the background sync, and `getAnimeById` gets it for its single item (see there).
async function withHqPosters(mediaList: any[]): Promise<AnimeBasic[]> {
  const basics = mediaList.map(mapMediaToBasic);
  const hqPosters = await resolveHqPosters(
    mediaList.map(m => ({ romaji: m.title?.romaji ?? '', english: m.title?.english, format: m.format, year: m.startDate?.year ?? null }))
  );
  basics.forEach((b, i) => { if (hqPosters[i]) b.coverImage.large = hqPosters[i] as string; });
  return basics;
}

export async function getTrendingAnime(page = 1, perPage = 20): Promise<BrowseResponse> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { currentPage hasNextPage lastPage perPage total }
        media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {
          id idMal title { romaji english native } coverImage { extraLarge large medium color }
          bannerImage
          format status episodes averageScore genres
          startDate { year }
          description(asHtml: false)
        }
      }
    }
  `;

  const data = await anilistQuery<any>(query, { page, perPage });
  const pageData = data.Page;

  return {
    results: await withHqPosters(pageData.media),
    hasNextPage: pageData.pageInfo.hasNextPage,
    pageInfo: pageData.pageInfo,
  };
}

export async function getPopularAnime(page = 1, perPage = 20): Promise<BrowseResponse> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { currentPage hasNextPage lastPage perPage total }
        media(type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
          id title { romaji english native } coverImage { extraLarge large medium color }
          bannerImage
          format status episodes averageScore genres
          startDate { year }
          description(asHtml: false)
        }
      }
    }
  `;

  const data = await anilistQuery<any>(query, { page, perPage });
  const pageData = data.Page;

  return {
    results: await withHqPosters(pageData.media),
    hasNextPage: pageData.pageInfo.hasNextPage,
    pageInfo: pageData.pageInfo,
  };
}

export async function searchAnime(queryStr: string, page = 1, perPage = 20, sort = 'POPULARITY_DESC'): Promise<SearchResponse> {
  const query = `
    query ($search: String!, $page: Int, $perPage: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(search: $search, type: ANIME, isAdult: false, sort: $sort) {
          id idMal title { romaji english native } coverImage { extraLarge large medium color }
          bannerImage
          format status episodes averageScore genres
          startDate { year }
          description(asHtml: false)
        }
      }
    }
  `;

  const data = await anilistQuery<any>(query, { search: queryStr, page, perPage, sort: [sort] });

  return {
    results: await withHqPosters(data.Page.media),
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}

export async function getAnimeById(id: number): Promise<AnimeDetail> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
          id idMal title { romaji english native } coverImage { extraLarge large medium color }
        format status episodes averageScore genres
        startDate { year }
        description(asHtml: false) bannerImage
        streamingEpisodes { thumbnail title site }
        relations {
          edges {
            relationType
            node { id title { romaji english } format coverImage { extraLarge large medium color } episodes bannerImage startDate { year } }
          }
        }
      }
    }
  `;

  const data = await anilistQuery<any>(query, { id });
  const media = data.Media;

  if (!media) {
    throw new Error(`Anime with ID ${id} not found`);
  }

  // Resolved here (not just on the detail page) so every consumer of this single function —
  // the detail page itself, watchlist/history/recommendation cards that look an anime up by
  // id, related-movie tiles — gets the same high-res, textless poster with no extra round
  // trip and no low-then-high swap. Written into `coverImage.extraLarge` rather than `.large`
  // so it flows through the existing `extraLarge ?? large` preference used everywhere.
  const movieNodes = (media.relations?.edges ?? [])
    .map((e: any) => e.node)
    .filter((n: any) => n?.format === 'MOVIE');

  const [mainHqPoster, relationHqPosters] = await Promise.all([
    resolveHqPoster({ romaji: media.title?.romaji ?? '', english: media.title?.english, format: media.format, year: media.startDate?.year ?? null }),
    resolveHqPosters(movieNodes.map((n: any) => ({ romaji: n.title?.romaji ?? '', english: n.title?.english, format: n.format, year: n.startDate?.year ?? null }))),
  ]);

  if (mainHqPoster) media.coverImage.extraLarge = mainHqPoster;
  movieNodes.forEach((n: any, i: number) => { if (relationHqPosters[i]) n.coverImage.extraLarge = relationHqPosters[i]; });

  return {
    ...mapMediaToBasic(media),
    description: media.description ?? null,
    bannerImage: media.bannerImage ?? null,
    relations: media.relations ?? { edges: [] },
    episodeThumbnails: null,
  };
}

export async function getGenres(): Promise<string[]> {
  const query = `
    query {
      GenreCollection
    }
  `;

  const data = await anilistQuery<any>(query);
  const genres: string[] = data.GenreCollection ?? [];
  return genres.filter((g) => g.toLowerCase() !== 'hentai');
}

export async function browseAnime(options: {
  page?: number;
  perPage?: number;
  genres?: string[];
  status?: string;
  sort?: string[];
  format?: string;
  year?: number;
  season?: string;
}): Promise<BrowseResponse> {
  const { page = 1, perPage = 20, genres, status, sort, format, year, season } = options;

  const sortValue = sort ?? ['POPULARITY_DESC'];
  const variables: Record<string, any> = { page, perPage, sort: sortValue, isAdult: false };

  if (genres && genres.length > 0) variables.genres = genres;
  if (status) variables.status = status;
  if (format) variables.format = format;
  if (year) variables.seasonYear = year;
  if (season) variables.season = season;

  const query = `
    query (
      $page: Int, $perPage: Int, $sort: [MediaSort], $isAdult: Boolean,
      $genres: [String], $status: MediaStatus, $format: MediaFormat,
      $seasonYear: Int, $season: MediaSeason
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { currentPage hasNextPage lastPage perPage total }
        media(
          type: ANIME, sort: $sort, isAdult: $isAdult,
          genre_in: $genres, status: $status, format: $format,
          seasonYear: $seasonYear, season: $season
        ) {
          id idMal title { romaji english native } coverImage { extraLarge large medium color }
          bannerImage
          format status episodes averageScore genres
          startDate { year }
          description(asHtml: false)
        }
      }
    }
  `;

  const data = await anilistQuery<any>(query, variables);
  const pageData = data.Page;

  return {
    results: await withHqPosters(pageData.media),
    hasNextPage: pageData.pageInfo.hasNextPage,
    pageInfo: pageData.pageInfo,
  };
}

interface CalendarEntry {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string; medium: string; color: string | null };
  episodes: number | null;
  nextAiringEpisode: { airingAt: number; episode: number } | null;
}

export async function getAnimeCalendar(): Promise<Map<string, CalendarEntry[]>> {
  const query = `
    query ($start: Int, $end: Int) {
      Page(perPage: 100) {
        airingSchedules(
          airingAt_greater: $start,
          airingAt_lesser: $end
        ) {
          episode
          airingAt
          media {
            id
            isAdult
            title { romaji english }
            coverImage { extraLarge large medium color }
            episodes
            format
            startDate { year }
          }
        }
      }
    }
  `;

  const now = Math.floor(Date.now() / 1000);
  const weekLater = now + 7 * 24 * 60 * 60;

  const data = await anilistQuery<any>(query, { start: now, end: weekLater });
  const schedules = data.Page?.airingSchedules ?? [];

  // Keyed by day index (0 = Sunday, per Date#getDay), not an English day name — the calendar
  // page looks this up under German day labels by default, and a hardcoded English name never
  // matched those, silently leaving every day empty regardless of what the schedule contained.
  const calendar = new Map<string, CalendarEntry[]>();

  const mediaMap = new Map<number, CalendarEntry>();

  schedules.forEach((schedule: any) => {
    const anime = schedule.media;
    if (!anime || anime.isAdult) return;

    const airingDate = new Date(schedule.airingAt * 1000);
    const dayIndex = airingDate.getDay();
    const dayName = String(dayIndex);

    if (!mediaMap.has(anime.id)) {
      mediaMap.set(anime.id, {
        id: anime.id,
        title: anime.title,
        coverImage: {
          large: anime.coverImage?.extraLarge || anime.coverImage?.large || '',
          medium: anime.coverImage?.large || anime.coverImage?.medium || '',
          color: anime.coverImage?.color ?? null,
        },
        episodes: anime.episodes,
        nextAiringEpisode: {
          airingAt: schedule.airingAt,
          episode: schedule.episode,
        },
      });
    }

    if (!calendar.has(dayName)) {
      calendar.set(dayName, []);
    }
    calendar.get(dayName)!.push(mediaMap.get(anime.id)!);
  });

  const entries = Array.from(mediaMap.values());
  const rawMedia = schedules
    .filter((s: any) => mediaMap.has(s.media?.id))
    .reduce((acc: Map<number, any>, s: any) => (acc.has(s.media.id) ? acc : acc.set(s.media.id, s.media)), new Map<number, any>());
  const hqPosters = await resolveHqPosters(
    entries.map(e => {
      const raw = rawMedia.get(e.id);
      return { romaji: raw?.title?.romaji ?? e.title.romaji, english: raw?.title?.english ?? e.title.english, format: raw?.format, year: raw?.startDate?.year ?? null };
    })
  );
  entries.forEach((e, i) => { if (hqPosters[i]) e.coverImage.large = hqPosters[i] as string; });

  return calendar;
}
