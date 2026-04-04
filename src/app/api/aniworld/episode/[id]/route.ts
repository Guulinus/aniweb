import { NextResponse } from 'next/server';
import { getEpisodeStreamLinks, resolveRedirect } from '@/lib/aniworld-client';
import { extractVoe } from '@/lib/voe-extractor';

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

    // Extract direct video URLs from embed hosts
    const resolvedLinks = await Promise.all(
      links.map(async (link) => {
        let directUrl = link.url;

        // Voe: use our custom extractor to get the .m3u8 URL
        if (link.hoster.includes('voe') || link.url.includes('voe') || link.url.includes('jefferycontrolmodel')) {
          const voeUrl = await extractVoe(link.url);
          if (voeUrl) directUrl = voeUrl;
        }

        return {
          hoster: link.hoster,
          url: directUrl,
        };
      })
    );

    // Prefer Voe (ad-free with our extractor), then others
    resolvedLinks.sort((a, b) => {
      const aIsVoe = a.url.includes('.m3u8') ? 0 : 1;
      const bIsVoe = b.url.includes('.m3u8') ? 0 : 1;
      return aIsVoe - bIsVoe;
    });

    return NextResponse.json({ links: resolvedLinks, available: resolvedLinks.length > 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stream links' },
      { status: 500 },
    );
  }
}
