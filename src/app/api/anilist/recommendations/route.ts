import { NextRequest, NextResponse } from 'next/server';
import { resolveHqPosters } from '@/lib/tmdb-client';

const ANILIST_API = 'https://graphql.anilist.co';

const query = `
  query ($id: Int) {
    Media(id: $id) {
      recommendations(perPage: 12, sort: [RATING_DESC, ID_DESC]) {
        nodes {
          mediaRecommendation {
            id
            idMal
            isAdult
            title { romaji english native }
            coverImage { extraLarge large medium color }
            bannerImage
            format
            status
            episodes
            averageScore
            genres
            startDate { year }
          }
        }
      }
    }
  }
`;

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: parseInt(id) } }),
      next: { revalidate: 86400 },
    });
    const data = await res.json();
    const nodes = data.data?.Media?.recommendations?.nodes ?? [];
    const recommendedMedia = nodes
      .map((n: any) => n.mediaRecommendation)
      .filter((m: any) => m && !m.isAdult);
    const results = recommendedMedia
      .map((m: any) => ({
        id: m.id,
        idMal: m.idMal ?? null,
        title: {
          romaji: m.title?.romaji ?? '',
          english: m.title?.english ?? null,
          native: m.title?.native ?? null,
        },
        coverImage: {
          large: m.coverImage?.extraLarge ?? m.coverImage?.large ?? '',
          medium: m.coverImage?.large ?? m.coverImage?.medium ?? '',
          color: m.coverImage?.color ?? null,
        },
        bannerImage: m.bannerImage ?? null,
        format: m.format ?? 'UNKNOWN',
        status: m.status ?? 'UNKNOWN',
        episodes: m.episodes ?? null,
        averageScore: m.averageScore ?? null,
        year: m.startDate?.year ?? null,
        genres: m.genres ?? [],
      }));

    const hqPosters = await resolveHqPosters(
      recommendedMedia.map((m: any) => ({ romaji: m.title?.romaji ?? '', english: m.title?.english, format: m.format, year: m.startDate?.year ?? null }))
    );
    results.forEach((r: any, i: number) => { if (hqPosters[i]) r.coverImage.large = hqPosters[i]; });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
