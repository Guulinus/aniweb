import type { AnimeBasic, AnimeDetail, SearchResponse, BrowseResponse } from '@/types';

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
  const episodeThumbnails: Record<number, string> = {};
  if (media.streamingEpisodes) {
    for (let i = 0; i < media.streamingEpisodes.length; i++) {
      const ep = media.streamingEpisodes[i];
      if (ep.thumbnail) {
        episodeThumbnails[i + 1] = ep.thumbnail;
      }
    }
  }
  
  return {
    id: media.id,
    idMal: media.idMal ?? null,
    title: {
      romaji: media.title?.romaji ?? '',
      english: media.title?.english ?? null,
      native: media.title?.native ?? null,
    },
    coverImage: {
      large: media.coverImage?.large ?? '',
      medium: media.coverImage?.medium ?? '',
    },
    bannerImage: media.bannerImage ?? null,
    format: media.format ?? 'UNKNOWN',
    status: media.status ?? 'UNKNOWN',
    episodes: media.episodes ?? null,
    averageScore: media.averageScore ?? null,
    year: media.startDate?.year ?? null,
    genres: media.genres ?? [],
    description: media.description ?? null,
    episodeThumbnails: Object.keys(episodeThumbnails).length > 0 ? episodeThumbnails : null,
  };
}

export async function getTrendingAnime(page = 1, perPage = 20): Promise<BrowseResponse> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { currentPage hasNextPage lastPage perPage total }
        media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {
          id idMal title { romaji english native } coverImage { large medium }
          bannerImage
          format status episodes averageScore genres
          startDate { year }
        }
      }
    }
  `;

  const data = await anilistQuery<any>(query, { page, perPage });
  const pageData = data.Page;

  return {
    results: pageData.media.map(mapMediaToBasic),
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
          id title { romaji english native } coverImage { large medium }
          bannerImage
          format status episodes averageScore genres
          startDate { year }
        }
      }
    }
  `;

  const data = await anilistQuery<any>(query, { page, perPage });
  const pageData = data.Page;

  return {
    results: pageData.media.map(mapMediaToBasic),
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
          id idMal title { romaji english native } coverImage { large medium }
          bannerImage
          format status episodes averageScore genres
          startDate { year }
          description
        }
      }
    }
  `;

  const data = await anilistQuery<any>(query, { search: queryStr, page, perPage, sort: [sort] });

  return {
    results: data.Page.media.map(mapMediaToBasic),
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}

export async function getAnimeById(id: number): Promise<AnimeDetail> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id idMal title { romaji english native } coverImage { large medium }
        format status episodes averageScore genres
        startDate { year }
        description bannerImage
        streamingEpisodes { thumbnail title site }
        relations {
          edges {
            relationType
            node { id title { romaji english } format coverImage { large medium } episodes bannerImage startDate { year } }
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

  const episodeThumbnails: Record<number, string> = {};
  if (media.streamingEpisodes) {
    for (let i = 0; i < media.streamingEpisodes.length; i++) {
      const ep = media.streamingEpisodes[i];
      if (ep.thumbnail) {
        episodeThumbnails[i + 1] = ep.thumbnail;
      }
    }
  }

  return {
    ...mapMediaToBasic(media),
    description: media.description ?? null,
    bannerImage: media.bannerImage ?? null,
    relations: media.relations ?? { edges: [] },
    episodeThumbnails: Object.keys(episodeThumbnails).length > 0 ? episodeThumbnails : null,
  };
}

export async function getGenres(): Promise<string[]> {
  const query = `
    query {
      GenreCollection
    }
  `;

  const data = await anilistQuery<any>(query);
  return data.GenreCollection ?? [];
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
          id idMal title { romaji english native } coverImage { large medium }
          bannerImage
          format status episodes averageScore genres
          startDate { year }
        }
      }
    }
  `;

  const data = await anilistQuery<any>(query, variables);
  const pageData = data.Page;

  return {
    results: pageData.media.map(mapMediaToBasic),
    hasNextPage: pageData.pageInfo.hasNextPage,
    pageInfo: pageData.pageInfo,
  };
}

interface CalendarEntry {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string; medium: string };
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
            title { romaji english }
            coverImage { large medium }
            episodes
          }
        }
      }
    }
  `;

  const now = Math.floor(Date.now() / 1000);
  const weekLater = now + 7 * 24 * 60 * 60;

  const data = await anilistQuery<any>(query, { start: now, end: weekLater });
  const schedules = data.Page?.airingSchedules ?? [];

  const calendar = new Map<string, CalendarEntry[]>();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const mediaMap = new Map<number, CalendarEntry>();

  schedules.forEach((schedule: any) => {
    const anime = schedule.media;
    if (!anime) return;

    const airingDate = new Date(schedule.airingAt * 1000);
    const dayIndex = airingDate.getDay();
    const dayName = days[dayIndex];

    if (!mediaMap.has(anime.id)) {
      mediaMap.set(anime.id, {
        id: anime.id,
        title: anime.title,
        coverImage: anime.coverImage,
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

  return calendar;
}
