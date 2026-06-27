import NodeCache from 'node-cache';
import { JSDOM } from 'jsdom';
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
  
  const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!res.ok) return null;
  const html = await res.text();
  cache.set(url, html);
  return html;
}

function parseEpisodeRows(html: string): { number: number; title: string; slug: string }[] {
  const episodes: { number: number; title: string; slug: string }[] = [];
  const seen = new Set<number>();

  // Primary: regex-based extraction (more resilient in production)
  const epPattern = /<tr[^>]*itemprop="episode"[^>]*>[\s\S]*?<\/tr>/gi;
  let match: RegExpExecArray | null;
  while ((match = epPattern.exec(html)) !== null) {
    const block = match[0];
    const numMatch = block.match(/itemprop="episodeNumber"\s*content="(\d+)"/i);
    if (!numMatch) continue;
    const epNum = parseInt(numMatch[1], 10);
    if (isNaN(epNum) || seen.has(epNum)) continue;
    seen.add(epNum);
    const titleMatch = block.match(/<strong>([\s\S]*?)<\/strong>/i);
    episodes.push({ number: epNum, title: (titleMatch?.[1]?.trim() ?? ''), slug: '' });
  }

  // Fallback: jsdom DOM parsing if regex found nothing
  if (episodes.length === 0) {
    try {
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      for (const tr of doc.querySelectorAll('tr[itemprop="episode"]')) {
        const metaEl = tr.querySelector('meta[itemprop="episodeNumber"]');
        if (!metaEl) continue;
        const epNum = parseInt(metaEl.getAttribute('content') ?? '', 10);
        if (isNaN(epNum) || seen.has(epNum)) continue;
        seen.add(epNum);
        const titleTd = tr.querySelector('td.seasonEpisodeTitle');
        const titleEl = titleTd?.querySelector('strong');
        episodes.push({ number: epNum, title: (titleEl?.textContent?.trim() ?? ''), slug: '' });
      }
    } catch {}
  }

  return episodes;
}

export async function getAniworldSeasons(slug: string): Promise<AniworldSeason[]> {
  const html = await fetchHtml(BASE_URL + '/anime/stream/' + slug);
  if (!html) return [];

  const seasonLinks = new Set<number>();
  for (const m of html.matchAll(/staffel-(\d+)/g)) seasonLinks.add(parseInt(m[1]));

  const result: AniworldSeason[] = [];
  for (const sn of [...seasonLinks].sort((a, b) => a - b)) {
    const shtml = await fetchHtml(BASE_URL + '/anime/stream/' + slug + '/staffel-' + sn);
    if (!shtml) continue;
    const episodes = parseEpisodeRows(shtml);
    if (episodes.length) {
      result.push({ seasonNumber: sn, episodes: episodes.sort((a, b) => a.number - b.number) });
    }
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
    const langMap: Record<string, string> = {
      '1': 'Ger-Dub',
      '2': 'Eng-Sub',
      '3': 'Ger-Sub',
    };
    const lang = langMap[m[1]];
    if (!lang) continue;
    const key = m[2];
    const liStart = m.index || 0;
    const liEnd = html.indexOf('</li>', liStart);
    const liContent = html.slice(liStart, liEnd > 0 ? liEnd + 5 : liStart + 500);
    const hoster = liContent.match(/<i class="icon ([^">]+)"/)?.[1]?.toLowerCase() || 'unknown';
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
  }
  
  const uniqueTerms = [...searchTermsSet].filter(t => t.length >= 2);
  
  for (const searchTerm of uniqueTerms) {
    if (searchTerm.length < 2) continue;
    
    try {
      const searchData = await fetch(BASE_URL + '/ajax/search', {
        method: 'POST',
        headers: { ...BROWSER_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'keyword=' + encodeURIComponent(searchTerm),
        cache: 'no-store',
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

export async function findAniworldMovie(title: string, year?: number | null) {
  const searchTerms: string[] = [];

  const noYear = title.replace(/\s*\(\d{4}\)\s*/g, ' ').replace(/['"]/g, '').replace(/\s+/g, ' ').trim();
  const cleaned = noYear.replace(/&/g, 'and');

  searchTerms.push(noYear);
  if (noYear !== cleaned) searchTerms.push(cleaned);

  // Add year-qualified term if available
  if (year) {
    searchTerms.push(`${noYear} ${year}`);
  }

  // Add the last 2-3 words as a specific search (often the unique part)
  const words = noYear.split(' ');
  if (words.length > 3) {
    searchTerms.push(words.slice(-3).join(' '));
    searchTerms.push(words.slice(-2).join(' '));
  }

  // Also add standalone movie keywords
  searchTerms.push(noYear.replace(/^(.*?)(?:\s*\(?\d{4}\)?)?$/, '$1 Film'));
  searchTerms.push(noYear.replace(/^(.*?)(?:\s*\(?\d{4}\)?)?$/, '$1 Movie'));

  const uniqueTerms = [...new Set(searchTerms.filter(t => t.length >= 3))];

  for (const searchTerm of uniqueTerms) {
    if (searchTerm.length < 2) continue;
    try {
      const searchData = await fetch(BASE_URL + '/ajax/search', {
        method: 'POST',
        headers: { ...BROWSER_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'keyword=' + encodeURIComponent(searchTerm),
        cache: 'no-store',
      });
      const text = await searchData.text();
      if (!text || text.length < 5) continue;
      let results;
      try { results = JSON.parse(text); } catch { continue; }
      if (!Array.isArray(results) || results.length === 0) continue;

      for (const r of results) {
        if (!r.link || !r.link.includes('/anime/stream/')) continue;
        const link = r.link.replace('/anime/stream/', '');

        // Sub-page movie: staffel-0/episode-{n}
        const epMatch = link.match(/^([^/]+)\/staffel-0\/episode-(\d+)$/);
        if (epMatch) {
          return { found: true, slug: epMatch[1], season: 0, episode: parseInt(epMatch[2]), aniworldTitle: r.title };
        }

        // Standalone movie: plain slug with few episodes
        const plainSlug = link.replace(/\/$/, '');
        if (!plainSlug.includes('/')) {
          const seasons = await getAniworldSeasons(plainSlug);
          if (seasons.length) {
            const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodes.length, 0);
            if (totalEpisodes <= 2) {
              const first = seasons[0];
              return { found: true, slug: plainSlug, season: first.seasonNumber, episode: first.episodes[0].number, aniworldTitle: r.title };
            }
          }
        }
      }
    } catch { continue; }
  }
  return { found: false, slug: null, season: null, episode: null, aniworldTitle: null };
}