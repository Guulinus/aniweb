import * as cheerio from 'cheerio';

const M2K_BASE = 'https://movie2k.ch';

export interface Movie2kStreamSource {
  hoster: string;
  embedUrl: string;
}

const HOSTER_MAP: Record<string, string> = {
  'doodstream.com': 'DoodStream',
  'dood.to': 'DoodStream',
  'dood.re': 'DoodStream',
  'dood.li': 'DoodStream',
  'd000d.com': 'DoodStream',
  'd-s.io': 'DoodStream',
  'ds2video.com': 'DoodStream',
  'doods.pro': 'DoodStream',
  'voe.sx': 'VOE',
  'voe.to': 'VOE',
  'vidmoly.me': 'Vidmoly',
  'vidmoly.to': 'Vidmoly',
  'vidoza.net': 'Vidoza',
  'vidoza.co': 'Vidoza',
  'streamtape.com': 'Streamtape',
  'streamtape.to': 'Streamtape',
  'streamtapeadblockuser.xyz': 'Streamtape',
  'strtape.site': 'Streamtape',
  'filemoon.sx': 'FileMoon',
  'lulustream.com': 'Lulustream',
  'speedfiles.com': 'Speedfiles',
  'vinovo.to': 'Vinovo',
  'vinovo.si': 'Vinovo',
  'streamplay.to': 'Streamplay',
  'upstream.to': 'Upstream',
  'mixdrop.co': 'MixDrop',
  'vidara.to': 'Vidara',
  'vidara.so': 'Vidara',
  'vidaraa.cc': 'Vidara',
  'playmogo.com': 'Playmogo',
  'vide0.net': 'Vide0',
  'wolfstream.tv': 'WolfStream',
};

function identifyHoster(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (HOSTER_MAP[hostname]) return HOSTER_MAP[hostname];
    const base = hostname.split('.')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return 'Unknown';
  }
}

function findBestMatch<T>(items: T[], searchTerm: string, getTitle: (item: T) => string): T | null {
  if (items.length === 0) return null;
  const lower = searchTerm.toLowerCase().trim();
  const exact = items.find(i => getTitle(i).toLowerCase().trim() === lower);
  if (exact) return exact;
  const startsWith = items.find(i => getTitle(i).toLowerCase().trim().startsWith(lower));
  if (startsWith) return startsWith;
  const contains = items.find(i => getTitle(i).toLowerCase().includes(lower));
  if (contains) return contains;
  return items[0];
}

export async function searchMovie2k(query: string): Promise<Array<{ title: string; id: string; posterImage: string }>> {
  try {
    const cleanQuery = query.replace(/\s*\(\d{4}\)\s*$/, '').trim();
    const res = await fetch(`${M2K_BASE}/data/search/?keyword=${encodeURIComponent(cleanQuery)}&lang=en`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const data = await res.json();
    
    return (data.movies || []).map((m: any) => ({
      title: m.title || '',
      id: m._id || '',
      posterImage: m.poster || '',
    }));
  } catch {
    return [];
  }
}

export async function getMovie2kMovie(movieId: string): Promise<{ streamSources: Movie2kStreamSource[] } | null> {
  try {
    const res = await fetch(`${M2K_BASE}/data/watch/?_id=${movieId}&lang=en`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const data = await res.json();

    const sources: Movie2kStreamSource[] = [];
    if (data.hosts) {
      for (const [hostUrl, embedUrl] of Object.entries(data.hosts)) {
        const embedStr = embedUrl as string;
        if (embedStr && embedStr.startsWith('http')) {
          sources.push({ hoster: identifyHoster(embedStr), embedUrl: embedStr });
        }
      }
    }

    return { streamSources: sources };
  } catch {
    return null;
  }
}

export async function searchAndGetMovie2kStreams(title: string): Promise<Movie2kStreamSource[]> {
  const results = await searchMovie2k(title);
  const best = findBestMatch(results, title, r => r.title);
  if (!best) return [];
  
  const movie = await getMovie2kMovie(best.id);
  return movie?.streamSources ?? [];
}

export async function searchAndGetMovie2kInfo(title: string): Promise<{ title: string; posterImage: string } | null> {
  const results = await searchMovie2k(title);
  const best = findBestMatch(results, title, r => r.title);
  return best ? { title: best.title, posterImage: best.posterImage } : null;
}
