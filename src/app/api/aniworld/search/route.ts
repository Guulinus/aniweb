import { NextRequest, NextResponse } from 'next/server';
import { findAniworldSeries } from '@/lib/aniworld-client';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const idNum = parseInt(id);
  if (isNaN(idNum)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    // Get anime info from AniList
    const query = `
      query ($id: Int) {
        Media(id: $id) {
          title { romaji english native }
          startDate { year }
        }
      }
    `;
    
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: idNum } }),
    });
    
    const data = await res.json();
    const media = data.data?.Media;
    
    if (!media) {
      return NextResponse.json({ error: 'Anime not found on AniList' }, { status: 404 });
    }
    
    const title = media.title.english ?? media.title.romaji ?? media.title.native;
    const year = media.startDate?.year ?? null;
    
    // Search on Aniworld
    const result = await findAniworldSeries(title, year);
    
    if (result.found && result.slug) {
      return NextResponse.json({ 
        slug: result.slug,
        title: result.aniworldTitle,
        seasons: result.seasons.map(s => s.seasonNumber)
      });
    }
    
    return NextResponse.json({ error: 'Not found on Aniworld' }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search' },
      { status: 500 }
    );
  }
}