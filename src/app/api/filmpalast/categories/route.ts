import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getHorrorSlugs, matchCuratedMovies } from '@/lib/filmpalast-client';
import { getTmdbPopularMovies, getTmdbMoviePosters } from '@/lib/tmdb-client';

const FP_BASE = 'https://filmpalast.to';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

const CATEGORY_URLS: Record<string, string> = {
  trending: '/',
  new: '/',
  action: '/search/genre/Action',
  comedy: '/search/genre/Komödie',
  family: '/search/genre/Familie',
  adventure: '/search/genre/Abenteuer',
  scifi: '/search/genre/Sci-Fi',
  drama: '/search/genre/Drama',
};

function absolutize(src: string): string {
  if (!src) return src;
  let url = src;
  if (url.startsWith('//')) url = `https:${url}`;
  else if (url.startsWith('/')) url = `${FP_BASE}${url}`;
  // Listing pages link the small 315px raster; 450px is the largest bucket filmpalast actually
  // serves (confirmed against the detail page's own cover art) — same file, bigger folder.
  return url.replace(/\/files\/movies\/\d+\//, '/files/movies/450/');
}

function extractSlug(href: string): string {
  const raw = href.replace(/^https?:\/\//, '').replace(/^\/+/, '').replace(/^filmpalast\.to\/?/, '');
  return raw.split('/').filter(Boolean).filter((p, i) => !(i === 0 && p === 'stream')).join('/');
}

// "Beliebt" is expensive to build (a filmpalast search per TMDB candidate), so it's cached
// longer than the plain scrape categories below.
let popularCache: { movies: Array<{ title: string; slug: string; posterImage: string; year: number | null }>; fetchedAt: number } | null = null;
const POPULAR_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function getPopularMovies() {
  if (popularCache && Date.now() - popularCache.fetchedAt < POPULAR_CACHE_TTL_MS) {
    return popularCache.movies;
  }
  const candidates = await getTmdbPopularMovies(2);
  const movies = await matchCuratedMovies(candidates, 20);
  popularCache = { movies, fetchedAt: Date.now() };
  return movies;
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') || 'trending';

  if (category === 'popular') {
    const movies = await getPopularMovies();
    return NextResponse.json({ movies }, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=21600' } });
  }

  // Any genre not in the curated map is treated as a literal filmpalast genre name, so the
  // browse page can filter by genre — except Horror, which stays off-limits everywhere it's
  // reached through this category param (the dedicated cross-reference filter below still
  // covers trending/new).
  const url = CATEGORY_URLS[category]
    ?? (category.toLowerCase() !== 'horror' ? `/search/genre/${encodeURIComponent(category)}` : null);

  if (!url) {
    return NextResponse.json({ movies: [] });
  }

  try {
    const res = await fetch(`${FP_BASE}${url}`, { headers: HEADERS });
    const html = await res.text();
    const $ = cheerio.load(html);

    const movies: Array<{ title: string; slug: string; posterImage: string; year: number | null }> = [];
    const seen = new Set<string>();

    $('a[href*="/stream/"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const title = $el.attr('title')?.trim() || '';
      if (!href.includes('/stream/') || !title) return;

      const titleMatch = title.match(/\bS\d{1,3}E\d{1,3}\b/i) || title.match(/\bStaffel\s*\d+\b/i);
      if (titleMatch) return;

      const slug = extractSlug(href);
      if (!slug) return;

      const posterImage = absolutize($el.find('img').attr('src') || $el.find('img').attr('data-src') || '');
      const yearMatch = title.match(/\((\d{4})\)/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;

      if (seen.has(slug)) {
        const existing = movies.find(m => m.slug === slug);
        if (existing && !existing.posterImage && posterImage) existing.posterImage = posterImage;
        return;
      }
      seen.add(slug);

      movies.push({ title: title.replace(/\s*\(\d{4}\)$/, ''), slug, posterImage, year });
    });

    // Cross-reference every category (not just trending/new) against Horror — filmpalast
    // tags movies with multiple genres, so a title can surface on e.g. the Sci-Fi genre page
    // while also being filed under Horror. The horror-slug cache only covers its first page,
    // so also catch anything self-labeled "Horror" in the title as a cheap backstop.
    const horrorSlugs = await getHorrorSlugs();
    const filtered = movies.filter(m => !horrorSlugs.has(m.slug) && !/\bhorror\b/i.test(m.title)).slice(0, 20);

    // filmpalast's own listing thumbnails cap out at a small, often lower-quality raster — TMDB
    // has proper high-res posters for almost every title, so every genre/browse row uses those
    // instead, falling back to filmpalast's art only when TMDB has no confident match.
    const tmdbPosters = await getTmdbMoviePosters(filtered.map(m => ({ title: m.title, year: m.year })));
    const withHqPosters = filtered.map((m, i) => ({ ...m, posterImage: tmdbPosters[i] || m.posterImage }));

    return NextResponse.json({ movies: withHqPosters }, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' } });
  } catch {
    return NextResponse.json({ movies: [] });
  }
}
