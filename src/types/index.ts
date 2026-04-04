export interface AnimeBasic {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
  coverImage: {
    large: string;
    medium: string;
  };
  format: string;
  status: string;
  episodes: number | null;
  averageScore: number | null;
  year: number | null;
  genres: string[];
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
      };
    }>;
  };
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

export interface WatchlistEntry {
  animeId: number;
  animeSlug: string;
  title: string;
  coverImage: string;
  status: WatchlistStatus;
  currentEpisode?: number;
  totalEpisodes?: number | null;
  addedAt: number;
}
