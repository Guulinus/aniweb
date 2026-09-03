import * as cheerio from 'cheerio';
import { getTmdbMoviePoster, getTmdbMoviePosters } from './tmdb-client';

const FP_BASE = 'https://filmpalast.to';

// filmpalast serves poster/cover <img> tags with root-relative paths (e.g. "/files/movies/..."),
// which resolve against our own origin unless rewritten to the real host.
function absolutize(src: string): string {
  if (!src) return src;
  let url = src;
  if (url.startsWith('//')) url = `https:${url}`;
  else if (url.startsWith('/')) url = `${FP_BASE}${url}`;
  // Grid/search listings link the small 315px raster; the detail page's own cover art goes up
  // to 450px (confirmed the only larger bucket filmpalast actually serves) — same URL shape,
  // just a bigger size folder, so every poster can use the sharper one at no extra cost.
  return url.replace(/\/files\/movies\/\d+\//, '/files/movies/450/');
}

export interface FilmStreamSource {
  hoster: string;
  embedUrl: string;
}

export interface FilmDetail {
  title: string;
  slug: string;
  description: string;
  posterImage: string;
  bannerImage: string;
  genres: string[];
  year: number | null;
  rating: number | null;
  runtimeMinutes: number | null;
  streamSources: FilmStreamSource[];
}

function extractSlug(href: string): string {
  const raw = href.replace(/^https?:\/\//, '').replace(/^\/+/, '').replace(/^filmpalast\.to\/?/, '');
  return raw.split('/').filter(Boolean).filter((p, i) => !(i === 0 && p === 'stream')).join('/');
}

export async function searchFilmpalast(query: string): Promise<Array<{ title: string; slug: string; posterImage: string }>> {
  try {
    // The search box posts to /search/title/<query> (confirmed via the header search form's
    // onchange handler) — /search/<query> 404s, which is why search silently returned nothing.
    const res = await fetch(`${FP_BASE}/search/title/${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: Array<{ title: string; slug: string; posterImage: string; year: number | null }> = [];
    const seen = new Set<string>();

    $('a[href*="/stream/"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const title = $el.attr('title')?.trim() || '';
      if (!title) return;

      // Skip per-episode series results ("... S02E07") — this is a movie search.
      if (/\bS\d{1,3}E\d{1,3}\b/i.test(title) || /\bStaffel\s*\d+\b/i.test(title)) return;

      const slug = extractSlug(href);
      if (!slug || seen.has(slug)) return;

      const posterImage = absolutize($el.find('img').attr('src') || '');
      if (!posterImage) return;
      seen.add(slug);
      const yearMatch = title.match(/\((\d{4})\)$/);
      results.push({ title: title.replace(/\s*\(\d{4}\)$/, ''), slug, posterImage, year: yearMatch ? parseInt(yearMatch[1]) : null });
    });

    const capped = results.slice(0, 20);
    const tmdbPosters = await getTmdbMoviePosters(capped.map(r => ({ title: r.title, year: r.year })));
    return capped.map((r, i) => ({ title: r.title, slug: r.slug, posterImage: tmdbPosters[i] || r.posterImage }));
  } catch {
    return [];
  }
}

// Homepage rows are curated ("kein Horror"), so raw scrapes get cross-referenced against the
// Horror genre listing and stripped. Cached in-process since the genre page rarely changes.
let horrorSlugsCache: { slugs: Set<string>; fetchedAt: number } | null = null;
const HORROR_CACHE_TTL_MS = 60 * 60 * 1000;

export async function getHorrorSlugs(): Promise<Set<string>> {
  if (horrorSlugsCache && Date.now() - horrorSlugsCache.fetchedAt < HORROR_CACHE_TTL_MS) {
    return horrorSlugsCache.slugs;
  }
  try {
    const res = await fetch(`${FP_BASE}/search/genre/Horror`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const slugs = new Set<string>();
    $('a[href*="/stream/"]').each((_, el) => {
      const slug = extractSlug($(el).attr('href') || '');
      if (slug) slugs.add(slug);
    });
    horrorSlugsCache = { slugs, fetchedAt: Date.now() };
    return slugs;
  } catch {
    return horrorSlugsCache?.slugs ?? new Set();
  }
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Conservative on purpose: unlike a "did you mean" search fallback, a wrong pick here shows
// the wrong movie's poster/stream under a well-known title, so a candidate with no reasonable
// title overlap is skipped entirely instead of guessing.
function findTitleMatch<T extends { title: string }>(items: T[], searchTerm: string): T | null {
  if (items.length === 0) return null;
  const target = normalizeTitle(searchTerm);
  const exact = items.find(i => normalizeTitle(i.title) === target);
  if (exact) return exact;
  const overlap = items.find(i => {
    const n = normalizeTitle(i.title);
    return n.startsWith(target) || target.startsWith(n) || n.includes(target) || target.includes(n);
  });
  return overlap ?? null;
}

export interface CuratedCandidate {
  title: string;
  originalTitle?: string;
  year: number | null;
  posterImage?: string;
}

export interface CuratedMovie {
  title: string;
  slug: string;
  posterImage: string;
  year: number | null;
}

// Cross-references a TMDB-ranked candidate list (real popularity/rating, not filmpalast's own
// scrape order) against what filmpalast actually has streamable, so "suggestions" reflect movies
// people have actually heard of instead of whatever filmpalast's front page happens to list.
export async function matchCuratedMovies(candidates: CuratedCandidate[], limit: number): Promise<CuratedMovie[]> {
  const slots: (CuratedMovie | null)[] = new Array(candidates.length).fill(null);
  const CONCURRENCY = 5;
  let idx = 0;

  async function worker() {
    while (idx < candidates.length) {
      const i = idx++;
      const c = candidates[i];
      try {
        let results = await searchFilmpalast(c.title);
        let match = findTitleMatch(results, c.title);
        if (!match && c.originalTitle && c.originalTitle !== c.title) {
          results = await searchFilmpalast(c.originalTitle);
          match = findTitleMatch(results, c.originalTitle);
        }
        if (match) {
          // The candidate came straight from TMDB's own popular-movies list, so its poster_path
          // is already the right high-quality art — no need to fall back to filmpalast's or
          // re-resolve via a second TMDB search.
          slots[i] = { title: match.title.replace(/\s*\(\d{4}\)$/, ''), slug: match.slug, posterImage: c.posterImage || match.posterImage, year: c.year };
        }
      } catch {}
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, worker));

  const horrorSlugs = await getHorrorSlugs();
  return slots
    .filter((m): m is CuratedMovie => m !== null)
    .filter(m => !horrorSlugs.has(m.slug) && !/\bhorror\b/i.test(m.title))
    .slice(0, limit);
}

export async function getFilmpalastMovie(slug: string): Promise<FilmDetail | null> {
  try {
    const res = await fetch(`${FP_BASE}/stream/${slug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('h2').first().text().trim() || $('title').text().trim();
    // The real synopsis lives in the schema.org itemprop, not the truncated <meta description>
    // (which is prefixed with SEO boilerplate like "X HD stream online anschauen - ").
    const description = $('span[itemprop="description"]').first().text().trim()
      || $('meta[name="description"]').attr('content') || '';
    // No og:image on this site — the real poster is the page's own cover art image, but it caps
    // out at a small (450px) raster. TMDB has proper high-res theatrical posters for almost
    // every movie, so it's tried first and only falls back to filmpalast's own art when TMDB has
    // no confident match at all.
    const fallbackPosterImage = absolutize(
      $('img.cover2').attr('src') || $('img.cover').first().attr('src') || $('meta[property="og:image"]').attr('content') || ''
    );

    // The sidebar's site-wide genre nav also matches `a[href*="/genre/"]`, so scope to the
    // "Kategorien, Genre" row in the movie's own detail list instead.
    const genres: string[] = [];
    $('#detail-content-list li').each((_, el) => {
      const $li = $(el);
      if (!$li.find('p').first().text().includes('Genre')) return;
      $li.find('a[href*="/genre/"]').each((_, a) => {
        const g = $(a).text().trim();
        if (g) genres.push(g);
      });
    });

    const infoText = $('#detail-content-list').text();
    const yearMatch = infoText.match(/Veröffentlicht:\s*(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;

    const runtimeMatch = infoText.match(/Spielzeit:\s*(\d+)\s*min/i);
    const runtimeMinutes = runtimeMatch ? parseInt(runtimeMatch[1]) : null;

    const ratingAttr = $('#star-rate').attr('data-rating');
    const ratingText = $('.rating .average').first().text().trim();
    const ratingRaw = parseFloat(ratingAttr || ratingText || '');
    const rating = Number.isFinite(ratingRaw) && ratingRaw > 0 ? ratingRaw : null;

    const tmdbPosterImage = await getTmdbMoviePoster(title, year);
    const posterImage = tmdbPosterImage || fallbackPosterImage;
    const bannerImage = posterImage;

    // filmpalast lists multiple hosters per movie, but only the first ("verystream"/firestream)
    // carries a `data-player-url` attribute — the rest (vidaraa, voe, playmate, ...) are plain
    // `href` links with the same `.iconPlay` class. The old selector only ever matched
    // `[data-player-url]`, so every other hoster was silently dropped — and for a movie whose
    // first/only listed hoster happens not to be the data-player-url one (e.g. VOE-only
    // listings), that meant zero stream sources at all, making the film look unavailable.
    // Each real hoster has a duplicate, commented-out copy of the same link right after it in
    // filmpalast's markup (a template leftover) — cheerio parses HTML comments as non-elements,
    // so `#grap-stream-list a.iconPlay` only ever matches the live one, not the commented copy.
    const streamSources: FilmStreamSource[] = [];
    const seenUrls = new Set<string>();
    $('#grap-stream-list a.iconPlay').each((_, el) => {
      const url = $(el).attr('data-player-url') || $(el).attr('href') || '';
      if (!url || url === '#' || seenUrls.has(url)) return;
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `${FP_BASE}${url}`);
        const hoster = urlObj.hostname.replace(/^www\./, '').split('.')[0];
        seenUrls.add(url);
        streamSources.push({ hoster, embedUrl: url });
      } catch {}
    });

    return { title, slug, description, posterImage, bannerImage, genres, year, rating, runtimeMinutes, streamSources };
  } catch {
    return null;
  }
}
