import NodeCache from 'node-cache';
import type { AniworldSeason, StreamLink } from '@/types';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const BASE_URL = 'https://aniworld.to';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function fetchHtml(url: string): Promise<string | null> {
  const cached = cache.get<string>(url);
  if (cached) return cached;
  
  const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return null;
  const html = await res.text();
  cache.set(url, html);
  return html;
}

export async function getAniworldSeasons(slug: string): Promise<AniworldSeason[]> {
  const html = await fetchHtml(BASE_URL + '/anime/stream/' + slug);
  if (!html) return [];

  const seasons = new Set<number>();
  for (const m of html.matchAll(/staffel-(\d+)/g)) seasons.add(parseInt(m[1]));

  const result: AniworldSeason[] = [];
  for (const sn of [...seasons].sort((a, b) => a - b)) {
    const shtml = await fetchHtml(BASE_URL + '/anime/stream/' + slug + '/staffel-' + sn);
    if (!shtml) continue;

    const episodes: { number: number; title: string; slug: string }[] = [];
    const pattern = /<meta[^>]*itemprop="episodeNumber"[^>]*content="(\d+)"[^>]*>[\s\S]*?<td[^>]*class="seasonEpisodeTitle"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/g;
    
    for (const m of shtml.matchAll(pattern)) {
      episodes.push({ number: parseInt(m[1]), title: m[2].trim(), slug: '' });
    }
    
    if (episodes.length) result.push({ seasonNumber: sn, episodes: episodes.sort((a, b) => a.number - b.number) });
  }
  return result;
}

export async function resolveRedirect(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'manual', signal: AbortSignal.timeout(10000) });
    if (res.status >= 300 && res.status < 400) return res.headers.get('location') || url;
  } catch {}
  return url;
}

export async function getEpisodeStreamLinks(slug: string, season: number, episode: number): Promise<StreamLink[]> {
  const html = await fetchHtml(BASE_URL + '/anime/stream/' + slug + '/staffel-' + season + '/episode-' + episode);
  if (!html) return [];

  const links: StreamLink[] = [];
  const seen = new Set<string>();
  const pattern = /<li[^>]*data-lang-key="(\d+)"[^>]*data-link-id="(\d+)"[^>]*>/g;

  for (const m of html.matchAll(pattern)) {
    if (m[1] !== '1' && m[1] !== '2') continue;
    const key = m[2];
    const liStart = m.index || 0;
    const liEnd = html.indexOf('</li>', liStart);
    const liContent = html.slice(liStart, liEnd > 0 ? liEnd + 5 : liStart + 500);
    const hoster = liContent.match(/<i class="icon ([^">]+)"/)?.[1]?.toLowerCase() || 'unknown';
    const lang = m[1] === '1' ? 'Ger-Dub' : 'Ger-Sub';
    const linkKey = hoster + '-' + m[1];
    if (seen.has(linkKey)) continue;
    seen.add(linkKey);
    links.push({ hoster, url: await resolveRedirect(BASE_URL + '/redirect/' + key), language: lang });
  }
  return links;
}

export async function findAniworldSeries(title: string, year: number | null, englishTitle?: string | null) {
  const allTitles = [title];
  if (englishTitle) allTitles.push(englishTitle);
  
  const searchTermsSet = new Set<string>();
  
  for (const t of allTitles) {
    const baseTitle = t.split(/[-:]/)[0].trim();
    const noYear = t.replace(/\s*\(\d{4}\)\s*/g, ' ').replace(/['"]/g, '').replace(/\s+/g, ' ').trim();
    
    searchTermsSet.add(baseTitle);
    searchTermsSet.add(noYear);
    searchTermsSet.add(noYear.replace(/&/g, 'and'));
    if (baseTitle.includes(' ')) {
      searchTermsSet.add(baseTitle.split(' ').slice(0, 2).join(' '));
    }
    searchTermsSet.add('JoJo');
  }
  
  const uniqueTerms = [...searchTermsSet].filter(t => t.length >= 2);
  
  for (const searchTerm of uniqueTerms) {
    if (searchTerm.length < 2) continue;
    
    try {
      const searchData = await fetch(BASE_URL + '/ajax/search', {
        method: 'POST',
        headers: { ...BROWSER_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'keyword=' + encodeURIComponent(searchTerm)
      });
      const text = await searchData.text();
      if (!text || text.length < 5) continue;
      
      let results;
      try {
        results = JSON.parse(text);
      } catch {
        continue;
      }
      if (!Array.isArray(results) || results.length === 0) continue;
      
      for (const r of results) {
        if (!r.link || !r.link.includes('/anime/stream/')) continue;
        const slug = r.link.replace('/anime/stream/', '');
        const seasons = await getAniworldSeasons(slug);
        if (seasons.length) return { found: true, slug, aniworldTitle: r.title, seasons };
      }
    } catch {
      continue;
    }
  }
  return { found: false, slug: null, aniworldTitle: null, seasons: [] };
}