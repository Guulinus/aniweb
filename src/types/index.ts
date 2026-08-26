export interface AnimeBasic {
  id: number;
  idMal?: number | null;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
  coverImage: {
    large: string;
    medium: string;
    color?: string | null;
  };
  bannerImage?: string | null;
  format: string;
  status: string;
  episodes: number | null;
  averageScore: number | null;
  year: number | null;
  genres: string[];
  description?: string | null;
  episodeThumbnails?: Record<number, string> | null;
}

export interface AnimeDetail extends AnimeBasic {
  description: string | null;
  bannerImage: string | null;
  relations: {
    edges: Array<{
      relationType: string;
      node: {
        id: number;
        title: {
          romaji: string;
          english: string | null;
        };
        format?: string;
        episodes?: number | null;
        coverImage?: {
          large: string;
          medium: string;
        };
        bannerImage?: string | null;
        startDate?: { year?: number | null } | null;
      };
    }>;
  };
}

export interface RelatedMovie {
  id: number;
  title: {
    romaji: string;
    english: string | null;
  };
  coverImage?: {
    large: string;
    medium: string;
  } | null;
  year?: number | null;
  relationType: string;
}

export interface AniworldSeason {
  seasonNumber: number;
  episodes: Array<{
    number: number;
    title: string;
    slug: string;
  }>;
}

export interface StreamLink {
  hoster: string;
  url: string;
  language?: string;
  hasAds?: boolean;
  quality?: string;
}

export interface EpisodeStream {
  episodeNumber: number;
  seasonNumber: number;
  links: StreamLink[];
}

export interface SearchResponse {
  results: AnimeBasic[];
  hasNextPage: boolean;
}

export interface BrowseResponse extends SearchResponse {
  pageInfo: {
    currentPage: number;
    hasNextPage: boolean;
    lastPage: number;
    perPage: number;
    total: number;
  };
}

export type WatchlistStatus = 'PLANNING' | 'WATCHING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED';

export interface User {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: number;
}

export interface WatchlistEntry {
  animeId: number;
  animeSlug: string;
  title: string;
  coverImage: string;
  status: WatchlistStatus;
  currentEpisode?: number;
  totalEpisodes?: number | null;
  addedAt: number;
  aniworldSlug?: string;
  lastWatched?: number;
  currentSeason?: number;
  updatedAt?: number;
}
