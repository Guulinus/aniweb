import { NextResponse } from 'next/server';
import { getEpisodeStreamLinks } from '@/lib/aniworld-client';
import { extractDirectUrl } from '@/lib/hosters';

async function checkHlsQuality(url: string): Promise<string> {
  if (!url.includes('.m3u8')) return 'unknown';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return 'unknown';
    const text = await res.text();
    // Check if it's a master playlist with variant streams
    const resolutions: number[] = [];
    const regex = /RESOLUTION=(\d+)x(\d+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      resolutions.push(parseInt(match[2])); // height (e.g., 1080)
    }
    if (resolutions.length === 0) return 'unknown';
    const max = Math.max(...resolutions);
    if (max >= 1080) return '1080p';
    if (max >= 720) return '720p';
    if (max >= 480) return '480p';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function qualityScore(q: string): number {
  if (q === '1080p') return 3;
  if (q === '720p') return 2;
  if (q === '480p') return 1;
  return 0;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string[] }> },
) {
  const { id } = await params;
  const joined = id.join('/');

  if (joined.length < 3) {
    return NextResponse.json(
      { error: 'Invalid episode ID. Expected format: slug/season/episode' },
      { status: 400 },
    );
  }

  const parts = joined.split('/');

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
    const links = await Promise.race([
      getEpisodeStreamLinks(slug, season, episode),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Episode fetch timed out')), 35000)),
    ]);

    // Extract direct video URLs with timeout for each hoster
    const extractionTimeout = 12000; // 12 seconds per hoster

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

    // Only check quality on links without ads (extracted successfully)
    const linksWithQuality = await Promise.all(
      resolvedLinks
        .filter(link => link.url && !link.hasAds)
        .map(async (link) => ({
          ...link,
          quality: await checkHlsQuality(link.url),
        }))
    );

    // Reorder hoster priority to prefer better-quality hosters
    const hosterPriority = ['voe', 'vidmoly', 'filemoon', 'lulustream', 'vidoza', 'doodstream'];

    const sortedLinks = linksWithQuality
      .sort((a, b) => {
        // 1. Language: Ger-Dub > Ger-Sub > Eng-Sub
        const langScore: Record<string, number> = { 'Ger-Dub': 2, 'Ger-Sub': 1, 'Eng-Sub': 0 };
        const aLang = langScore[a.language ?? ''] ?? 0;
        const bLang = langScore[b.language ?? ''] ?? 0;
        if (aLang !== bLang) return bLang - aLang;

        // 2. Quality: prefer highest resolution
        const aQ = qualityScore(a.quality);
        const bQ = qualityScore(b.quality);
        if (aQ !== bQ) return bQ - aQ;

        // 3. HLS over embed/MP4
        const aIsHls = a.url.includes('.m3u8');
        const bIsHls = b.url.includes('.m3u8');
        if (aIsHls && !bIsHls) return -1;
        if (!aIsHls && bIsHls) return 1;

        // 4. Known hoster priority
        const aPriority = hosterPriority.indexOf(a.hoster.toLowerCase());
        const bPriority = hosterPriority.indexOf(b.hoster.toLowerCase());
        if (aPriority !== -1 && bPriority === -1) return -1;
        if (aPriority === -1 && bPriority !== -1) return 1;
        if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;

        return 0;
      });

    const res = NextResponse.json({ links: sortedLinks, available: sortedLinks.length > 0 });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stream links' },
      { status: 500 },
    );
  }
}
