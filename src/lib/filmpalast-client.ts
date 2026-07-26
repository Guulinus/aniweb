import * as cheerio from 'cheerio';

const FP_BASE = 'https://filmpalast.to';

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
  streamSources: FilmStreamSource[];
}

export async function searchFilmpalast(query: string): Promise<Array<{ title: string; slug: string; posterImage: string }>> {
  try {
    const res = await fetch(`${FP_BASE}/search/${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: Array<{ title: string; slug: string; posterImage: string }> = [];

    $('a.movie-box').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const slug = href.replace(/^\//, '');
      const title = $el.find('.title').text().trim() || $el.find('h2').text().trim();
      const posterImage = $el.find('img').attr('src') || '';
      if (slug && title) {
        results.push({ title, slug, posterImage });
      }
    });

    return results.slice(0, 20);
  } catch {
    return [];
  }
}

export async function getFilmpalastMovie(slug: string): Promise<FilmDetail | null> {
  try {
    const res = await fetch(`${FP_BASE}/stream/${slug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('h2').first().text().trim() || $('title').text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    const posterImage = $('meta[property="og:image"]').attr('content') || '';
    const bannerImage = posterImage;

    const genres: string[] = [];
    $('a[href*="/genre/"]').each((_, el) => {
      const g = $(el).text().trim();
      if (g) genres.push(g);
    });

    const yearMatch = $('title').text().match(/\((\d{4})\)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;

    const streamSources: FilmStreamSource[] = [];
    $('a[href*="data-player-url"], [data-player-url]').each((_, el) => {
      const url = $(el).attr('data-player-url') || $(el).attr('href') || '';
      if (url) {
        const urlObj = new URL(url.startsWith('http') ? url : `${FP_BASE}${url}`);
        const hoster = urlObj.hostname.replace(/^www\./, '').split('.')[0];
        streamSources.push({ hoster, embedUrl: url });
      }
    });

    return { title, slug, description, posterImage, bannerImage, genres, year, rating: null, streamSources };
  } catch {
    return null;
  }
}
