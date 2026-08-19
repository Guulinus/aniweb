import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const FP_BASE = 'https://filmpalast.to';

const CATEGORY_URLS: Record<string, string> = {
  trending: '/',
  new: '/',
  action: '/search/genre/Action',
  comedy: '/search/genre/Komödie',
};

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') || 'trending';
  const url = CATEGORY_URLS[category];

  if (!url) {
    return NextResponse.json({ movies: [] });
  }

  try {
    const res = await fetch(`${FP_BASE}${url}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
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

      const raw = href.replace(/^https?:\/\//, '').replace(/^\/+/, '').replace(/^filmpalast\.to/, '');
      const slug = raw.split('/').filter(Boolean).filter((p, i) => !(i === 0 && p === 'stream')).join('/');
      if (!slug) return;

      const posterImage = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';
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

    return NextResponse.json({ movies: movies.slice(0, 20) }, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' } });
  } catch {
    return NextResponse.json({ movies: [] });
  }
}
