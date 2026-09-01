import { NextRequest, NextResponse } from 'next/server';
import { getFilmpalastMovie } from '@/lib/filmpalast-client';
import { getMovie2kMovie, searchAndGetMovie2kStreams } from '@/lib/movie2k-client';
import { extractDirectUrl, getExtractorForUrl } from '@/lib/hosters';

interface StreamResult {
  hoster: string;
  url: string;
  name: string;
  hasAds: boolean;
  source: 'filmpalast' | 'movie2k';
}

async function resolveStreamSources(
  sources: Array<{ hoster: string; embedUrl: string }>,
  sourceName: 'filmpalast' | 'movie2k'
): Promise<StreamResult[]> {
  return Promise.all(
    sources.map(async (source) => {
      if (!source.embedUrl.startsWith('http')) {
        return { hoster: 'Direct', url: source.embedUrl, name: source.hoster, hasAds: true, source: sourceName };
      }
      try {
        const result = await Promise.race([
          extractDirectUrl(source.embedUrl, source.hoster),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 20000)),
        ]);
        if (result) {
          return { hoster: result.hoster, url: result.url, name: source.hoster, hasAds: false, source: sourceName };
        }
      } catch {}
      // An embed *page* URL (firestream.to/e/...) is never itself a playable video source —
      // handing it to Artplayer when extraction fails just gets a silent "00:00, never loads"
      // player instead of a clear error. Only fall back to the raw URL for hosters with no
      // known extractor at all, where it's at least an unverified last resort rather than a
      // guaranteed dead end.
      if (!getExtractorForUrl(source.embedUrl, source.hoster)) {
        return { hoster: source.hoster.toLowerCase(), url: source.embedUrl, name: source.hoster, hasAds: true, source: sourceName };
      }
      return { hoster: source.hoster.toLowerCase(), url: '', name: source.hoster, hasAds: true, source: sourceName };
    })
  );
}

function dedupeAndSort(links: StreamResult[]): StreamResult[] {
  const seenHosters = new Set<string>();
  const deduped: StreamResult[] = [];

  for (const link of links) {
    if (!link.url) continue;
    const hosterKey = link.hoster.toLowerCase();
    if (seenHosters.has(hosterKey)) continue;
    seenHosters.add(hosterKey);
    deduped.push(link);
  }

  return deduped.sort((a, b) => {
    if (!a.hasAds && b.hasAds) return -1;
    if (a.hasAds && !b.hasAds) return 1;
    return 0;
  });
}

async function fetchMovie2kStreams(movieId: string, slug: string): Promise<StreamResult[]> {
  try {
    const movie = await getMovie2kMovie(movieId);
    if (movie?.streamSources && movie.streamSources.length > 0) {
      return resolveStreamSources(movie.streamSources, 'movie2k');
    }
  } catch {}

  try {
    const titleFromSlug = slug.replace(/-/g, ' ');
    const streams = await searchAndGetMovie2kStreams(titleFromSlug);
    if (streams && streams.length > 0) {
      return resolveStreamSources(streams, 'movie2k');
    }
  } catch {}

  return [];
}

type RouteParams = { id: string[] };

// Resolving a firestream link takes two live requests (embed page + token resolve, ~10-15s
// total) and the signed URL it returns is itself only valid for ~10-12 minutes — caching well
// under that means a reload or a second visitor watching the same film shortly after gets an
// instant response instead of re-running the whole resolve chain for a link that still works.
const streamCache = new Map<string, { links: StreamResult[]; expiresAt: number }>();
const STREAM_CACHE_TTL_MS = 8 * 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams },
) {
  const { id } = params;
  const joined = id.join('/');
  const source = request.nextUrl.searchParams.get('source') || 'filmpalast';
  const movieId = request.nextUrl.searchParams.get('id') || joined;

  if (joined.length < 3) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const cacheKey = `${source}:${joined}`;
  const cached = streamCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json({ links: cached.links, available: cached.links.length > 0 });
  }

  try {
    const movie2kPromise = fetchMovie2kStreams(movieId, joined);
    const filmpalastPromise = getFilmpalastMovie(joined)
      .then(movie => movie?.streamSources ? resolveStreamSources(movie.streamSources, 'filmpalast') : [])
      .catch(() => []);

    const [movie2kLinks, filmpalastLinks] = await Promise.all([movie2kPromise, filmpalastPromise]);

    const allLinks = source === 'movie2k'
      ? [...movie2kLinks, ...filmpalastLinks]
      : [...filmpalastLinks, ...movie2kLinks];

    const sortedLinks = dedupeAndSort(allLinks);

    // Only cache an actual result — an empty/failed resolve should be retried on the next
    // request rather than locked in as "unavailable" for the full TTL.
    if (sortedLinks.length > 0) {
      streamCache.set(cacheKey, { links: sortedLinks, expiresAt: Date.now() + STREAM_CACHE_TTL_MS });
    }

    return NextResponse.json({ links: sortedLinks, available: sortedLinks.length > 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch streams' },
      { status: 500 }
    );
  }
}
