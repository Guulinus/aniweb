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

  const seasons: AniworldSeason[] = [];

  // Extract season numbers from href patterns like /anime/stream/slug/staffel-1
  const seasonMatches = html.matchAll(/staffel-(\d+)/g);
  const seasonNumbers = new Set<number>();
  for (const match of seasonMatches) {
    seasonNumbers.add(parseInt(match[1]));
  }

  for (const seasonNum of [...seasonNumbers].sort((a, b) => a - b)) {
    const episodePattern = new RegExp(`staffel-${seasonNum}/episode-(\\d+)`, 'g');
    const episodeNumbers: number[] = [];
    for (const match of html.matchAll(episodePattern)) {
      episodeNumbers.push(parseInt(match[1]));
    }

    if (episodeNumbers.length > 0) {
      const maxEpisode = Math.max(...episodeNumbers);
      const episodes = [];
      for (let i = 1; i <= maxEpisode; i++) {
        episodes.push({
          number: i,
          title: `Episode ${i}`,
          slug: '',
        });
      }
      seasons.push({
        seasonNumber: seasonNum,
        episodes,
      });
    }
  }

  return seasons;
}

export async function getEpisodeStreamLinks(slug: string, season: number, episode: number): Promise<StreamLink[]> {
  const url = `${BASE_URL}/anime/stream/${slug}/staffel-${season}/episode-${episode}`;
  const html = await fetchHtml(url);
  if (!html) return [];

  const links: StreamLink[] = [];
  const seen = new Set<string>();

  // Pattern: <li class="..." data-lang-key="N" data-link-id="ID" data-link-target="/redirect/ID" ...>
  // The li contains the data attributes, and inside it has <i class="icon HOSTER">
  const liPattern = /<li[^>]*data-lang-key="(\d+)"[^>]*data-link-id="(\d+)"[^>]*data-link-target="\/redirect\/(\d+)"[^>]*>([\s\S]*?)<\/li>/g;

  for (const match of html.matchAll(liPattern)) {
    const langKey = match[1];
    const redirectId = match[3];
    const liContent = match[4];

    // lang-key: 1=GerDub, 2=GerSub, 3=EngSub - only German
    if (langKey !== '1' && langKey !== '2') continue;

    // Extract hoster from <i class="icon HOSTER">
    let hoster = 'unknown';
    const iconMatch = liContent.match(/<i class="icon ([^"]+)"/);
    if (iconMatch) {
      hoster = iconMatch[1].toLowerCase();
    }

    const linkKey = `${hoster}-${langKey}`;
    if (seen.has(linkKey)) continue;
    seen.add(linkKey);

    links.push({
      hoster,
      url: `${BASE_URL}/redirect/${redirectId}`,
    });
  }

  return links;
}

export async function resolveStreamUrl(redirectUrl: string): Promise<string | null> {
  try {
    const res = await fetch(redirectUrl, {
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });

    let embedUrl = redirectUrl;
    if (res.status >= 300 && res.status < 400) {
      embedUrl = res.headers.get('location') ?? redirectUrl;
    }

    if (embedUrl.includes('vidmoly')) {
      const pageHtml = await fetchHtml(embedUrl);
      if (pageHtml) {
        const m3u8Match = pageHtml.match(/sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/);
        if (m3u8Match) return m3u8Match[1];
        const fileMatch = pageHtml.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);
        if (fileMatch) return fileMatch[1];
      }
    }

    if (embedUrl.includes('voe')) {
      const pageHtml = await fetchHtml(embedUrl);
      if (pageHtml) {
        const voeMatch = pageHtml.match(/hls:\s*["']([^"']+)["']/);
        if (voeMatch) return voeMatch[1];
        const hlsMatch = pageHtml.match(/"hls":\s*"([^"]+)"/);
        if (hlsMatch) return hlsMatch[1];
      }
    }

    if (embedUrl.includes('streamtape')) {
      const pageHtml = await fetchHtml(embedUrl);
      if (pageHtml) {
        const stMatch = pageHtml.match(/document\.getElementById\(['"]videolink['"]\)\.innerHTML\s*=\s*['"](\/\/[^'"]+)['"]/);
        if (stMatch) return `https:${stMatch[1]}`;
      }
    }

    return embedUrl;
  } catch {
    return null;
  }
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
