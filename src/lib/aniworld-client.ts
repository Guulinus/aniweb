import NodeCache from 'node-cache';
import type { AniworldSeason, StreamLink } from '@/types';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

const BASE_URL = 'https://aniworld.to';
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface SearchResult {
  title: string;
  slug: string;
  description: string;
  cover: string;
  productionYear: string;
}

async function fetchHtml(url: string): Promise<string | null> {
  const cached = cache.get<string>(url);
  if (cached) return cached;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    cache.set(url, html);
    return html;
  } catch {
    return null;
  }
}

async function fetchJson(url: string, method: string = 'GET', body?: URLSearchParams): Promise<any> {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body ? body.toString() : undefined,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function searchAniworld(query: string): Promise<SearchResult[]> {
  const data = await fetchJson(
    `${BASE_URL}/ajax/search`,
    'POST',
    new URLSearchParams({ keyword: query }),
  );
  if (!data || !Array.isArray(data)) return [];

  return data
    .filter((item: any) => item.link?.startsWith('/anime/stream/'))
    .map((item: any) => ({
      title: item.title.replace(/<\/?em>/g, ''),
      slug: item.link.replace('/anime/stream/', ''),
      description: item.description ?? '',
      cover: item.cover ?? '',
      productionYear: item.productionYear ?? '',
    }));
}

function extractYear(yearStr: string): number {
  const match = yearStr.match(/\d{4}/);
  return match ? parseInt(match[0]) : 0;
}

export async function getAniworldSeasons(slug: string): Promise<AniworldSeason[]> {
  const html = await fetchHtml(`${BASE_URL}/anime/stream/${slug}`);
  if (!html) return [];

  const seasonNumbers = new Set<number>();
  const seasonMatches = html.matchAll(/staffel-(\d+)/g);
  for (const match of seasonMatches) {
    seasonNumbers.add(parseInt(match[1]));
  }

  const sortedSeasons = [...seasonNumbers].sort((a, b) => a - b);

  const seasonResults = await Promise.all(
    sortedSeasons.map(async (seasonNum) => {
      const seasonHtml = await fetchHtml(`${BASE_URL}/anime/stream/${slug}/staffel-${seasonNum}`);
      if (!seasonHtml) return null;

      const episodePattern = /episode-(\d+)/g;
      const episodeNumbers: number[] = [];
      for (const match of seasonHtml.matchAll(episodePattern)) {
        episodeNumbers.push(parseInt(match[1]));
      }

      if (episodeNumbers.length === 0) return null;

      const maxEpisode = Math.max(...episodeNumbers);
      const episodes = [];
      for (let i = 1; i <= maxEpisode; i++) {
        episodes.push({
          number: i,
          title: `Episode ${i}`,
          slug: '',
        });
      }
      return {
        seasonNumber: seasonNum,
        episodes,
      };
    })
  );

  return seasonResults.filter((s): s is NonNullable<typeof s> => s !== null);
}

export async function resolveRedirect(redirectUrl: string): Promise<string> {
  try {
    const res = await fetch(redirectUrl, {
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (location) return location;
    }

    // If no redirect, return original
    return redirectUrl;
  } catch {
    return redirectUrl;
  }
}

export async function getEpisodeStreamLinks(slug: string, season: number, episode: number): Promise<StreamLink[]> {
  const url = `${BASE_URL}/anime/stream/${slug}/staffel-${season}/episode-${episode}`;
  const html = await fetchHtml(url);
  if (!html) return [];

  const links: StreamLink[] = [];
  const seen = new Set<string>();

  const liPattern = /<li[^>]*data-lang-key="(\d+)"[^>]*data-link-id="(\d+)"[^>]*data-link-target="\/redirect\/(\d+)"[^>]*>([\s\S]*?)<\/li>/g;

  for (const match of html.matchAll(liPattern)) {
    const langKey = match[1];
    const redirectId = match[3];
    const liContent = match[4];

    // lang-key: 1=GerDub, 2=GerSub, 3=EngSub - only German
    if (langKey !== '1' && langKey !== '2') continue;

    let hoster = 'unknown';
    const iconMatch = liContent.match(/<i class="icon ([^"]+)"/);
    if (iconMatch) {
      hoster = iconMatch[1].toLowerCase();
    }

    const language = langKey === '1' ? 'Ger-Dub' : 'Ger-Sub';

    const linkKey = `${hoster}-${langKey}`;
    if (seen.has(linkKey)) continue;
    seen.add(linkKey);

    // Resolve the redirect to get the actual embed URL
    const redirectUrl = `${BASE_URL}/redirect/${redirectId}`;
    const embedUrl = await resolveRedirect(redirectUrl);

    links.push({
      hoster,
      url: embedUrl,
      language,
    });
  }

  return links;
}

export async function findAniworldSeries(title: string, year: number | null): Promise<{
  found: boolean;
  slug: string | null;
  aniworldTitle: string | null;
  seasons: AniworldSeason[];
}> {
  const variants = new Set<string>();
  variants.add(title);

  const words = title.split(/[\s:]+/).slice(0, 3).join(' ');
  if (words.length > 2) variants.add(words);

  const beforeColon = title.split(/[:\-–]/)[0].trim();
  if (beforeColon.length > 2) variants.add(beforeColon);

  const cleaned = title
    .replace(/\s*(Movie|Film|Part|Season|Arc|Ova|Special|Oav)\s*\d*[:\s].*$/i, '')
    .replace(/\s*\(\d{4}\)\s*$/, '')
    .trim();
  if (cleaned.length > 2) variants.add(cleaned);

  for (const variant of variants) {
    const results = await searchAniworld(variant);
    if (!results.length) continue;

    for (const result of results) {
      const resultYear = extractYear(result.productionYear);
      const yearMatch = !year || !resultYear || Math.abs(resultYear - year) <= 2;

      if (yearMatch) {
        const seasons = await getAniworldSeasons(result.slug);
        return {
          found: seasons.length > 0,
          slug: result.slug,
          aniworldTitle: result.title,
          seasons,
        };
      }
    }
  }

  return { found: false, slug: null, aniworldTitle: null, seasons: [] };
}
