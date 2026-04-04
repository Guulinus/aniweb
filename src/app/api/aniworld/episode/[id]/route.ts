import { NextResponse } from 'next/server';
import { getEpisodeStreamLinks } from '@/lib/aniworld-client';
import { extractDirectUrl } from '@/lib/hosters';

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

    // Extract direct video URLs with timeout for each hoster
    const extractionTimeout = 8000; // 8 seconds per hoster

    const resolvedLinks = await Promise.all(
      links.map(async (link) => {
        try {
          // Race between extraction and timeout
          const result = await Promise.race([
            extractDirectUrl(link.url, link.hoster),
            new Promise<null>(resolve =>
              setTimeout(() => resolve(null), extractionTimeout)
            ),
          ]);

          if (result) {
            return {
              hoster: result.hoster,
              url: result.url,
              language: link.language,
              hasAds: false,
            };
          }
        } catch {
          // Extraction failed, return original
        }

        // Fallback to original URL if extraction failed (embed = has ads)
        return {
          hoster: link.hoster,
          url: link.url,
          language: link.language,
          hasAds: true,
        };
      })
    );

    // Sort: prefer m3u8 (HLS) streams, then known working hosters
    const hosterPriority = ['voe', 'vidoza', 'vidmoly', 'lulustream', 'doodstream', 'filemoon'];

    const sortedLinks = resolvedLinks
      .filter(link => link.url)
      .sort((a, b) => {
        // Prefer extracted m3u8 URLs (direct and ad-free)
        const aIsHls = a.url.includes('.m3u8');
        const bIsHls = b.url.includes('.m3u8');
        if (aIsHls && !bIsHls) return -1;
        if (!aIsHls && bIsHls) return 1;

        // Then prefer known working hosters
        const aPriority = hosterPriority.indexOf(a.hoster.toLowerCase());
        const bPriority = hosterPriority.indexOf(b.hoster.toLowerCase());

        if (aPriority !== -1 && bPriority === -1) return -1;
        if (aPriority === -1 && bPriority !== -1) return 1;
        if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;

        return 0;
      });

    return NextResponse.json({ links: sortedLinks, available: sortedLinks.length > 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stream links' },
      { status: 500 },
    );
  }
}
