import { NextRequest, NextResponse } from 'next/server';

const ANILIST_API = 'https://graphql.anilist.co';

const ANIME_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id idMal title { romaji english }
      relations {
        edges {
          relationType
          node { id title { romaji english } }
        }
      }
    }
  }
`;

async function fetchEntry(id: number): Promise<{ idMal: number | null; relations: any } | null> {
  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: ANIME_QUERY, variables: { id } }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.errors) return null;
    const media = json.data?.Media;
    if (!media) return null;
    return { idMal: media.idMal ?? null, relations: media.relations ?? { edges: [] } };
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const animeId = parseInt(request.nextUrl.searchParams.get('animeId') ?? '');
    const season = parseInt(request.nextUrl.searchParams.get('season') ?? '1');

    if (isNaN(animeId) || animeId <= 0) {
      return NextResponse.json({ malId: null, error: 'Invalid animeId' });
    }
    if (isNaN(season) || season < 1) {
      return NextResponse.json({ malId: null, error: 'Invalid season' });
    }

    if (season === 1) {
      const entry = await fetchEntry(animeId);
      return NextResponse.json({ malId: entry?.idMal ?? null });
    }

    let currentId = animeId;
    for (let i = 0; i < season - 1; i++) {
      const entry = await fetchEntry(currentId);
      if (!entry) {
        return NextResponse.json({ malId: null });
      }
      const sequel = entry.relations.edges.find(
        (e: any) => e.relationType === 'SEQUEL'
      );
      if (!sequel) {
        return NextResponse.json({ malId: null });
      }
      currentId = sequel.node.id;
    }

    const finalEntry = await fetchEntry(currentId);
    return NextResponse.json({ malId: finalEntry?.idMal ?? null });
  } catch {
    return NextResponse.json({ malId: null });
  }
}
