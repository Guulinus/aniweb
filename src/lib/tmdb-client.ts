const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = '7a6f6473c46188721c31804f166eb53d';
// w780 for posters/banners (large display size), w500 for small episode stills.
const TMDB_IMG_POSTER = 'https://image.tmdb.org/t/p/w780';
const TMDB_IMG_STILL = 'https://image.tmdb.org/t/p/w500';
// Full-resolution poster (~2000px), only for the one hero image per anime detail page where
// it's worth the extra bytes — everything else keeps the smaller, faster w780/w500 tiers.
const TMDB_IMG_POSTER_XL = 'https://image.tmdb.org/t/p/original';

function normalizeTmdbTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// `searchTmdbId` used to accept whatever TMDB's search returned first, with no check that it
// was actually the right show — the same class of bug that made AniList/TMDB posters "wrong
// artwork" on the homepage before it got reverted. Require real title overlap before accepting.
function tmdbResultLikelyMatches(result: { name?: string; original_name?: string; title?: string; original_title?: string }, candidates: string[]): boolean {
  const resultTitles = [result.name, result.original_name, result.title, result.original_title]
    .filter(Boolean)
    .map(t => normalizeTmdbTitle(t as string));
  // Multi-cour franchises are titled per-arc on AniList ("JoJo's Bizarre Adventure: Stardust
  // Crusaders") but TMDB only has the umbrella show ("JoJo's Bizarre Adventure") — so also
  // accept a match on just the part before the ":"/"-" separator, not only the full title.
  const withBaseTitles = candidates.flatMap(c => {
    const base = c.split(/[:\-]/)[0].trim();
    return base && base !== c ? [c, base] : [c];
  });
  return withBaseTitles.some(c => {
    const nc = normalizeTmdbTitle(c);
    if (!nc || nc.length < 3) return false;
    return resultTitles.some(rt => rt === nc || rt.includes(nc) || nc.includes(rt));
  });
}

export interface TmdbMovie {
  title: string;
  slug: string;
  posterImage: string;
  year: number | null;
}

export interface TmdbFilmInfo {
  title: string;
  posterImage: string;
  runtimeMinutes: number | null;
  year: number | null;
}

export async function getTmdbFilmInfo(title: string): Promise<TmdbFilmInfo | null> {
  try {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=de-DE`
    );
    const data = await res.json();
    const movie = data.results?.find((m: any) => m.title && !m.adult) ?? data.results?.[0];
    if (!movie) return null;

    let runtime: number | null = null;
    try {
      const detailRes = await fetch(
        `${TMDB_BASE}/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=de-DE`
      );
      const detail = await detailRes.json();
      runtime = detail.runtime && detail.runtime > 0 ? detail.runtime : null;
    } catch {}

    return {
      title: movie.title || movie.original_title,
      posterImage: movie.poster_path ? `${TMDB_IMG_POSTER}${movie.poster_path}` : '',
      runtimeMinutes: runtime,
      year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
    };
  } catch {
    return null;
  }
}

export async function searchTmdbMovie(query: string): Promise<TmdbMovie[]> {
  try {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=de-DE`
    );
    const data = await res.json();

    return (data.results ?? []).slice(0, 10).map((m: any) => ({
      title: m.title || m.original_title,
      slug: (m.title || m.original_title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      posterImage: m.poster_path ? `${TMDB_IMG_POSTER}${m.poster_path}` : '',
      year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : null,
    }));
  } catch {
    return [];
  }
}

export interface TmdbPopularCandidate {
  title: string;
  originalTitle: string;
  year: number | null;
}

// Real-world popularity/rating signal (à la Netflix's "Trending"/"Popular") to rank curated
// homepage suggestions by, since filmpalast's own listing order is just upload recency.
export async function getTmdbPopularMovies(pages = 2): Promise<TmdbPopularCandidate[]> {
  const candidates: TmdbPopularCandidate[] = [];
  for (let page = 1; page <= pages; page++) {
    try {
      const res = await fetch(
        `${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=de-DE&region=DE&page=${page}`
      );
      const data = await res.json();
      for (const m of data.results ?? []) {
        if (!m.title || m.adult) continue;
        candidates.push({
          title: m.title,
          originalTitle: m.original_title || m.title,
          year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : null,
        });
      }
    } catch {}
  }
  return candidates;
}

export async function getTmdbMovieTrailer(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=de-DE`
    );
    const data = await res.json();
    const movie = data.results?.[0];
    if (!movie) return null;

    const videoRes = await fetch(
      `${TMDB_BASE}/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}&language=de-DE`
    );
    const videoData = await videoRes.json();
    const trailer = videoData.results?.find(
      (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
    ) || videoData.results?.find(
      (v: any) => v.site === 'YouTube'
    );

    return trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;
  } catch {
    return null;
  }
}

// Strips trailing season/cour markers ("Season 3", "2nd Season", "Part 2", "Cour 2") that
// AniList includes in the title but TMDB's show name never has — TMDB's search is not fuzzy
// enough to find "Attack on Titan" when queried as "Attack on Titan Season 3" and returns zero
// results, so the base title needs to be tried as its own candidate.
function stripSeasonSuffix(t: string): string {
  let prev: string;
  let cur = t.replace(/\s*\((?:TV|OVA|ONA|Movie|Special)\)\s*$/i, '').trim();
  // Suffixes can stack ("... Season 3 Part 2") — strip repeatedly until nothing more matches,
  // one single pass would leave "Season 3" behind after only removing "Part 2".
  do {
    prev = cur;
    cur = cur
      .replace(/[,:\-]?\s*(?:\d+(?:st|nd|rd|th)|final)\s+season\s*$/i, '')
      .replace(/[,:\-]?\s*season\s+\d+\s*$/i, '')
      .replace(/[,:\-]?\s*part\s+\d+\s*$/i, '')
      .replace(/[,:\-]?\s*cour\s+\d+\s*$/i, '')
      .trim();
  } while (cur !== prev && cur.length > 0);
  return cur;
}

export async function searchTmdbId(romaji: string, english?: string | null): Promise<number | null> {
  // Trailing disambiguation markers like "(TV)" (used by AniList when multiple
  // entries share a title) don't exist on TMDB and make the search return zero
  // results, so strip them before querying.
  const clean = stripSeasonSuffix;
  // English titles are far more likely to exactly match TMDB's (usually English) show
  // titles than romaji, so try both languages verbatim first and only fall back to the
  // stripped versions afterward — otherwise a cleaned romaji title can match an unrelated
  // show (e.g. a spin-off/sequel sharing the same base name) before the correct English
  // match is even attempted.
  const titles = [english, romaji].filter(Boolean) as string[];
  const candidates = Array.from(new Set([...titles, ...titles.map(clean)]));

  for (const title of candidates) {
    try {
      const res = await fetch(
        `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=de-DE`,
        { next: { revalidate: 21600 } }
      );
      const data = await res.json();
      const results = data.results ?? [];
      if (results.length === 0) continue;
      // Prefer a validated match over blindly taking the top hit, but still fall back to it
      // if nothing else in the top few looks right — better than returning nothing at all,
      // since this only feeds episode-thumbnail matching (low-stakes) by default.
      const validated = results.slice(0, 5).find((r: any) => tmdbResultLikelyMatches(r, candidates));
      if (validated) return validated.id;
      if (results.length === 1 || candidates.indexOf(title) === candidates.length - 1) return results[0].id;
    } catch {}
  }
  return null;
}

// Stricter variant for the one place a wrong match is highly visible (the detail-page hero
// poster) — returns null instead of guessing when nothing actually looks like the right show.
export async function searchTmdbIdStrict(romaji: string, english?: string | null): Promise<number | null> {
  const titles = [english, romaji].filter(Boolean) as string[];
  const candidates = Array.from(new Set([...titles, ...titles.map(stripSeasonSuffix)]));

  for (const title of candidates) {
    try {
      const res = await fetch(
        `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=de-DE`,
        { next: { revalidate: 21600 } }
      );
      const data = await res.json();
      const results = data.results ?? [];
      const validated = results.slice(0, 5).find((r: any) => tmdbResultLikelyMatches(r, candidates));
      if (validated) return validated.id;
    } catch {}
  }
  return null;
}

interface TmdbImageEntry {
  file_path: string;
  iso_639_1: string | null;
  vote_average?: number;
  width?: number;
  height?: number;
}

function pickBestPoster(posters: TmdbImageEntry[]): string | null {
  if (posters.length === 0) return null;
  // TMDB posters usually carry a baked-in title logo in whatever language they're tagged
  // with — `iso_639_1: null` is TMDB's convention for the textless/art-only variant, which
  // is what we actually want here (matches AniList's plain-art cover style, no printed title).
  const portrait = (p: TmdbImageEntry) => !p.width || !p.height || p.height / p.width >= 1.2;
  const textless = posters.filter(p => p.iso_639_1 === null && portrait(p));
  const pool = textless.length > 0 ? textless : posters.filter(portrait);
  const best = [...pool].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0];
  return best?.file_path ? `${TMDB_IMG_POSTER_XL}${best.file_path}` : null;
}

export async function getTmdbPoster(tmdbId: number, type: 'tv' | 'movie' = 'tv'): Promise<string | null> {
  try {
    const res = await fetch(`${TMDB_BASE}/${type}/${tmdbId}/images?api_key=${TMDB_API_KEY}`, { next: { revalidate: 21600 } });
    const data = await res.json();
    return pickBestPoster((data.posters ?? []) as TmdbImageEntry[]);
  } catch {
    return null;
  }
}

interface TmdbSeasonMeta {
  seasonNumber: number;
  year: number | null;
}

async function getTmdbSeasonYears(tmdbId: number): Promise<TmdbSeasonMeta[]> {
  try {
    const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`, { next: { revalidate: 21600 } });
    const data = await res.json();
    if (!Array.isArray(data.seasons)) return [];
    return data.seasons
      .filter((s: any) => s.season_number > 0)
      .map((s: any) => ({
        seasonNumber: s.season_number,
        year: s.air_date ? parseInt(String(s.air_date).slice(0, 4)) : null,
      }));
  } catch {
    return [];
  }
}

async function getTmdbSeasonPoster(tmdbId: number, seasonNumber: number): Promise<string | null> {
  try {
    const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}/images?api_key=${TMDB_API_KEY}`, { next: { revalidate: 21600 } });
    const data = await res.json();
    return pickBestPoster((data.posters ?? []) as TmdbImageEntry[]);
  } catch {
    return null;
  }
}

// TMDB has one poster gallery per show, but also a separate, distinct gallery per season —
// the show-level one used to be all `getTmdbPoster` ever fetched, so every AniList entry
// for the same franchise (season 2, season 3, a differently-titled arc) resolved to the exact
// same tmdbId and therefore the exact same poster. Matching by release year against TMDB's
// per-season air dates (title-based season matching is unreliable — arcs rarely share TMDB's
// "Season N" naming) picks the actual season-specific art instead, when one exists.
//
// The show-level poster is fetched in parallel with the season lookup (not only as a fallback
// after it) purely for latency — same total requests when a season match is found and used,
// one extra when it isn't, but no added round trip either way.
async function getTmdbShowPoster(tmdbId: number, year: number | null | undefined): Promise<string | null> {
  if (!year) return getTmdbPoster(tmdbId, 'tv');

  const [seasons, showPoster] = await Promise.all([
    getTmdbSeasonYears(tmdbId),
    getTmdbPoster(tmdbId, 'tv'),
  ]);

  const withYear = seasons.filter(s => s.year !== null);
  if (withYear.length > 0) {
    const closest = withYear.reduce((best, s) =>
      Math.abs((s.year as number) - year) < Math.abs((best.year as number) - year) ? s : best
    );
    // Only trust the match if it's actually close — otherwise this is probably the wrong
    // show entirely and falling back to the generic poster is safer than a random season.
    if (Math.abs((closest.year as number) - year) <= 1) {
      const seasonPoster = await getTmdbSeasonPoster(tmdbId, closest.seasonNumber);
      if (seasonPoster) return seasonPoster;
    }
  }
  return showPoster;
}

async function searchTmdbMovieIdStrict(romaji: string, english?: string | null): Promise<number | null> {
  const candidates = [english, romaji].filter(Boolean) as string[];
  for (const title of candidates) {
    try {
      const res = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=de-DE`, { next: { revalidate: 21600 } });
      const data = await res.json();
      const results = data.results ?? [];
      const validated = results.slice(0, 5).find((r: any) => tmdbResultLikelyMatches(r, candidates));
      if (validated) return validated.id;
    } catch {}
  }
  return null;
}

// Resolving + validating a poster costs 2-3 TMDB requests, so results are cached in-process —
// this gets reused heavily across users hitting the same popular/trending/browse rows.
const hqPosterCache = new Map<string, { url: string | null; expiresAt: number }>();
const HQ_POSTER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const HQ_POSTER_TIMEOUT_MS = 5000;

export interface HqPosterCandidate {
  romaji: string;
  english?: string | null;
  format?: string | null;
  year?: number | null;
}

// The one entry point every cover-image call site should go through for the "high quality,
// no printed title, load it directly (not a low-then-high swap)" poster. Bounded by a timeout
// so a slow/rate-limited TMDB can't stall the page — callers fall back to AniList's own cover
// when this resolves to null (timeout, no confident match, or no textless art available).
export async function resolveHqPoster(candidate: HqPosterCandidate): Promise<string | null> {
  // Keyed by year too — otherwise every season/arc of the same franchise (same title search,
  // same tmdbId) would share one cache entry and thus one poster, right back to the bug this
  // whole year-matching path exists to fix.
  const cacheKey = `${candidate.format ?? 'TV'}:${candidate.year ?? ''}:${candidate.english || candidate.romaji}`;
  const cached = hqPosterCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.url;

  const run = async (): Promise<string | null> => {
    if (candidate.format === 'MOVIE') {
      const id = await searchTmdbMovieIdStrict(candidate.romaji, candidate.english);
      return id ? getTmdbPoster(id, 'movie') : null;
    }
    const id = await searchTmdbIdStrict(candidate.romaji, candidate.english);
    return id ? getTmdbShowPoster(id, candidate.year) : null;
  };

  let result: string | null = null;
  try {
    result = await Promise.race([
      run(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), HQ_POSTER_TIMEOUT_MS)),
    ]);
  } catch {
    result = null;
  }

  hqPosterCache.set(cacheKey, { url: result, expiresAt: Date.now() + HQ_POSTER_CACHE_TTL_MS });
  return result;
}

// Bulk variant for list pages (browse/popular/trending/search/calendar/seasonal) — resolves
// with bounded concurrency so a 20-50 item page doesn't fire that many requests at once, and
// caps the whole batch so one slow lookup can't hold up the rest of an already-slow page.
export async function resolveHqPosters(candidates: HqPosterCandidate[], concurrency = 10): Promise<(string | null)[]> {
  const results: (string | null)[] = new Array(candidates.length).fill(null);
  let idx = 0;
  async function worker() {
    while (idx < candidates.length) {
      const i = idx++;
      try {
        results[i] = await resolveHqPoster(candidates[i]);
      } catch {
        results[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, worker));
  return results;
}

export interface TmdbSeasonName {
  seasonNumber: number;
  name: string;
}

// TMDB season names often carry the arc/cour title (e.g. "Stardust Crusaders",
// "Diamond is Unbreakable") for franchises AniWorld groups into one page with
// numbered seasons — used to figure out which AniWorld season a specific
// AniList entry (which has its own arc-named title, not a "Season N" label)
// actually corresponds to.
export async function getTmdbShowSeasons(tmdbId: number): Promise<TmdbSeasonName[]> {
  try {
    const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
    const data = await res.json();
    if (!Array.isArray(data.seasons)) return [];
    return data.seasons
      .filter((s: any) => s.season_number > 0)
      .map((s: any) => ({ seasonNumber: s.season_number, name: s.name as string }));
  } catch {
    return [];
  }
}

export async function getTmdbSeasonThumbnails(tmdbId: number, seasons: number[]): Promise<Record<number, Record<number, string>>> {
  const thumbnails: Record<number, Record<number, string>> = {};

  for (const seasonNum of seasons) {
    try {
      const res = await fetch(
        `${TMDB_BASE}/tv/${tmdbId}/season/${seasonNum}?api_key=${TMDB_API_KEY}&language=de-DE`
      );
      const data = await res.json();
      if (data.episodes?.length > 0) {
        const epThumbs: Record<number, string> = {};
        for (const ep of data.episodes) {
          if (ep.still_path) {
            epThumbs[ep.episode_number] = `${TMDB_IMG_STILL}${ep.still_path}`;
          }
        }
        if (Object.keys(epThumbs).length > 0) {
          thumbnails[seasonNum] = epThumbs;
        }
      }
    } catch {}
  }

  return thumbnails;
}
