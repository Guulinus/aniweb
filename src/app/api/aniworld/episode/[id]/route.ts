import { NextResponse } from 'next/server';
import { getEpisodeStreamLinks } from '@/lib/aniworld-client';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parts = id.split('/');

  if (parts.length < 3) {
    return NextResponse.json(
      { error: 'Invalid episode ID. Expected format: slug/season/episode' },
      { status: 400 },
    );
  }

  const [slug, seasonStr, episodeStr] = parts;
  const season = parseInt(seasonStr);
  const episode = parseInt(episodeStr);

  if (isNaN(season) || isNaN(episode)) {
    return NextResponse.json(
      { error: 'Invalid season or episode number' },
      { status: 400 },
    );
  }

  try {
    const links = await getEpisodeStreamLinks(slug, season, episode);
    return NextResponse.json({ links, available: links.length > 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stream links' },
      { status: 500 },
    );
  }
}
