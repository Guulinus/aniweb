import type { AnimeBasic, AnimeDetail, SearchResponse, BrowseResponse } from '@/types';

const ANILIST_API = 'https://graphql.anilist.co';

async function anilistQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`AniList API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors?.length > 0) {
    throw new Error(`AniList GraphQL error: ${data.errors[0].message}`);
  }

  return data.data;
}

function mapMediaToBasic(media: any): AnimeBasic {
  return {
    id: media.id,
    title: {
      romaji: media.title?.romaji ?? '',
      english: media.title?.english ?? null,
      native: media.title?.native ?? null,
    },
    coverImage: {
      large: media.coverImage?.large ?? '',
      medium: media.coverImage?.medium ?? '',
    },
    format: media.format ?? 'UNKNOWN',
    status: media.status ?? 'UNKNOWN',
    episodes: media.episodes ?? null,
    averageScore: media.averageScore ?? null,
    year: media.startDate?.year ?? null,
    genres: media.genres ?? [],
  };
}

export async function getTrendingAnime(page = 1, perPage = 20): Promise<BrowseResponse> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { currentPage hasNextPage lastPage perPage total }
        media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {
          id title { romaji english native } coverImage { large medium }
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

export async function searchAnime(queryStr: string, page = 1, perPage = 20): Promise<SearchResponse> {
  const query = `
    query ($search: String!, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(search: $search, type: ANIME, isAdult: false) {
          id title { romaji english native } coverImage { large medium }
          format status episodes averageScore genres
          startDate { year }
        }
      }
    }
  `;

  const data = await anilistQuery<any>(query, { search: queryStr, page, perPage });

  return {
    results: data.Page.media.map(mapMediaToBasic),
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}

export async function getAnimeById(id: number): Promise<AnimeDetail> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id title { romaji english native } coverImage { large medium }
        format status episodes averageScore genres
        startDate { year }
        description bannerImage
        relations {
          edges {
            relationType
            node { id title { romaji english } }
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

  return {
    ...mapMediaToBasic(media),
    description: media.description ?? null,
    bannerImage: media.bannerImage ?? null,
    relations: media.relations ?? { edges: [] },
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
}): Promise<BrowseResponse> {
  const { page = 1, perPage = 20, genres, status, sort, format, year } = options;

  const sortValue = sort ?? ['POPULARITY_DESC'];
  const variables: Record<string, any> = { page, perPage, sort: sortValue, isAdult: false };

  if (genres && genres.length > 0) variables.genres = genres;
  if (status) variables.status = status;
  if (format) variables.format = format;
  if (year) variables.seasonYear = year;

  const query = `
    query (
      $page: Int, $perPage: Int, $sort: [MediaSort], $isAdult: Boolean,
      $genres: [String], $status: MediaStatus, $format: MediaFormat, $seasonYear: Int
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { currentPage hasNextPage lastPage perPage total }
        media(
          type: ANIME, sort: $sort, isAdult: $isAdult,
          genre_in: $genres, status: $status, format: $format, seasonYear: $seasonYear
        ) {
          id title { romaji english native } coverImage { large medium }
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
