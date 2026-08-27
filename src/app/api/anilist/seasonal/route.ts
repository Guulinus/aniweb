import { NextResponse } from 'next/server';
import { resolveHqPosters } from '@/lib/tmdb-client';

const ANILIST_API = 'https://graphql.anilist.co';

function getCurrentSeason(): { season: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  let season: string;
  if (month <= 3) season = 'WINTER';
  else if (month <= 6) season = 'SPRING';
  else if (month <= 9) season = 'SUMMER';
  else season = 'FALL';
  return { season, year };
}

const query = `
  query ($season: MediaSeason, $seasonYear: Int, $perPage: Int) {
    Page(perPage: $perPage) {
      pageInfo { hasNextPage }
      media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: [POPULARITY_DESC], isAdult: false) {
        id idMal title { romaji english native } coverImage { extraLarge large medium color }
        bannerImage
        format status episodes averageScore genres
        startDate { year }
      }
    }
  }
`;

export async function GET() {
  const { season, year } = getCurrentSeason();

  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { season, seasonYear: year, perPage: 50 } }),
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    const media = data.data?.Page?.media ?? [];
    const results = media.map((m: any) => ({
      id: m.id,
      idMal: m.idMal ?? null,
      title: { romaji: m.title?.romaji ?? '', english: m.title?.english ?? null, native: m.title?.native ?? null },
      coverImage: { large: m.coverImage?.extraLarge ?? m.coverImage?.large ?? '', medium: m.coverImage?.large ?? m.coverImage?.medium ?? '', color: m.coverImage?.color ?? null },
      bannerImage: m.bannerImage ?? null,
      format: m.format ?? 'UNKNOWN',
      status: m.status ?? 'UNKNOWN',
      episodes: m.episodes ?? null,
      averageScore: m.averageScore ?? null,
      year: m.startDate?.year ?? null,
      genres: m.genres ?? [],
    }));

    const hqPosters = await resolveHqPosters(
      media.map((m: any) => ({ romaji: m.title?.romaji ?? '', english: m.title?.english, format: m.format }))
    );
    results.forEach((r: any, i: number) => { if (hqPosters[i]) r.coverImage.large = hqPosters[i]; });

    return NextResponse.json({ results, season, year }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    });
  } catch {
    return NextResponse.json({ results: [], season, year });
  }
}
