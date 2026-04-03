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
