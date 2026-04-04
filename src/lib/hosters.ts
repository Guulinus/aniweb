import https from 'https';
import http from 'http';
import { URL } from 'url';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function fetchText(url: string, referer?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    if (referer) headers['Referer'] = referer;

    const req = lib.get(url, { headers, timeout: 15000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const location = res.headers.location;
        if (location.startsWith('/')) {
          const base = new URL(url);
          fetchText(base.origin + location, url).then(resolve, reject);
        } else {
          fetchText(location, url).then(resolve, reject);
        }
        return;
      }
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function resolveUrl(base: string, relative: string): string {
  return new URL(relative, base).href;
}

// ============================================================================
// VOE EXTRACTOR
// ============================================================================

function voeDecode(ct: string, lutsStr: string): Record<string, unknown> {
  const lut = lutsStr.slice(2, -2).split("','").map((i: string) => {
    return i.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
  });

  let txt = '';
  for (const char of ct) {
    let x = char.charCodeAt(0);
    if (x > 64 && x < 91) {
      x = ((x - 52) % 26) + 65;
    } else if (x > 96 && x < 123) {
      x = ((x - 84) % 26) + 97;
    }
    txt += String.fromCharCode(x);
  }

  for (const pattern of lut) {
    txt = txt.replace(new RegExp(pattern, 'g'), '');
  }

  ct = Buffer.from(txt, 'base64').toString('utf-8');
  txt = '';
  for (const char of ct) {
    txt += String.fromCharCode(char.charCodeAt(0) - 3);
  }

  txt = Buffer.from(txt.split('').reverse().join(''), 'base64').toString('utf-8');
  return JSON.parse(txt);
}

export async function extractVoe(embedUrl: string): Promise<string | null> {
  try {
    let url = embedUrl;
    let text = await fetchText(url);

    // Follow JavaScript redirects
    let redirectCount = 0;
    while (redirectCount < 5) {
      const redirectMatch = text.match(/window\.location\.href\s*=\s*'([^']+)'/);
      if (!redirectMatch) break;
      url = redirectMatch[1];
      text = await fetchText(url);
      redirectCount++;
    }

    const codeAndScriptMatch = text.match(/json">\[("[\s\S]*?")\]<\/script>\s*<script\s*src="([^"]+)"/);
    if (!codeAndScriptMatch) return null;

    const encodedPayload = codeAndScriptMatch[1];
    const scriptUrl = resolveUrl(url, codeAndScriptMatch[2]);
    const scriptText = await fetchText(scriptUrl);

    const lutsMatch = scriptText.match(/(\[(?:'\W{2}'[,\]]){1,9})/);
    if (!lutsMatch) return null;

    const result = voeDecode(encodedPayload, lutsMatch[1]) as Record<string, unknown>;
    return (result.source as string) ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// DOODSTREAM EXTRACTOR
// ============================================================================

export async function extractDoodstream(embedUrl: string): Promise<string | null> {
  try {
    // Convert /d/ to /e/ if needed
    let url = embedUrl.replace('/d/', '/e/');

    const html = await fetchText(url);

    // Extract pass_md5 URL
    const passMd5Match = html.match(/\/pass_md5\/[^'"]+/);
    if (!passMd5Match) return null;

    const passMd5Path = passMd5Match[0];
    const baseUrl = new URL(url).origin;
    const passMd5Url = baseUrl + passMd5Path;

    // Get the partial video URL
    const partialUrl = await fetchText(passMd5Url, url);

    // Extract token from original embed
    const tokenMatch = html.match(/\?token=([^&"']+)/);
    const token = tokenMatch ? tokenMatch[1] : '';

    // Build final URL with random digits and expiry
    const randomDigits = Math.floor(Math.random() * 90000000 + 10000000);
    const expiry = Date.now();

    // Doodstream uses direct MP4, not m3u8
    const finalUrl = `${partialUrl}${randomDigits}?token=${token}&expiry=${expiry}`;

    return finalUrl;
  } catch {
    return null;
  }
}

// ============================================================================
// VIDMOLY EXTRACTOR
// ============================================================================

export async function extractVidmoly(embedUrl: string): Promise<string | null> {
  try {
    const html = await fetchText(embedUrl);

    // Method 1: Look for sources in JavaScript
    const sourcesMatch = html.match(/sources:\s*\[\s*\{[^}]*file:\s*["']([^"']+)["']/);
    if (sourcesMatch) {
      return sourcesMatch[1];
    }

    // Method 2: Look for m3u8 URL directly
    const m3u8Match = html.match(/["']([^"']*\.m3u8[^"']*)["']/);
    if (m3u8Match) {
      return m3u8Match[1].replace(/\\\//g, '/');
    }

    // Method 3: Look for file: "..." pattern
    const fileMatch = html.match(/file:\s*["']([^"']+)["']/);
    if (fileMatch) {
      return fileMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// FILEMOON EXTRACTOR
// ============================================================================

export async function extractFilemoon(embedUrl: string): Promise<string | null> {
  try {
    const html = await fetchText(embedUrl);

    // Method 1: Look for sources in JavaScript (similar to Vidmoly)
    const sourcesMatch = html.match(/sources:\s*\[\s*\{[^}]*file:\s*["']([^"']+)["']/);
    if (sourcesMatch) {
      return sourcesMatch[1];
    }

    // Method 2: Look for m3u8 URL
    const m3u8Match = html.match(/["']([^"']*\.m3u8[^"']*)["']/);
    if (m3u8Match) {
      return m3u8Match[1].replace(/\\\//g, '/');
    }

    // Method 3: Decode from script if encoded
    const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
    if (scriptMatch) {
      for (const script of scriptMatch) {
        // Look for base64 encoded data
        const base64Match = script.match(/atob\(["']([^"']+)["']\)/);
        if (base64Match) {
          try {
            const decoded = Buffer.from(base64Match[1], 'base64').toString('utf-8');
            const urlMatch = decoded.match(/["']([^"']*\.m3u8[^"']*)["']/);
            if (urlMatch) {
              return urlMatch[1];
            }
          } catch {}
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// LULUSTREAM EXTRACTOR
// ============================================================================

export async function extractLulustream(embedUrl: string): Promise<string | null> {
  try {
    const html = await fetchText(embedUrl);

    // Look for m3u8 source
    const m3u8Match = html.match(/["']([^"']*\.m3u8[^"']*)["']/);
    if (m3u8Match) {
      return m3u8Match[1].replace(/\\\//g, '/');
    }

    // Look for source: { file: "..." }
    const sourceMatch = html.match(/file:\s*["']([^"']+)["']/);
    if (sourceMatch) {
      return sourceMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// VIDOZA EXTRACTOR
// ============================================================================

export async function extractVidoza(embedUrl: string): Promise<string | null> {
  try {
    const html = await fetchText(embedUrl);

    // Vidoza typically has direct m3u8 URLs
    const m3u8Match = html.match(/["']([^"']*\.m3u8[^"']*)["']/);
    if (m3u8Match) {
      return m3u8Match[1].replace(/\\\//g, '/');
    }

    // Look for source file
    const sourceMatch = html.match(/src:\s*["']([^"']+)["']/);
    if (sourceMatch) {
      return sourceMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// SPEEDFILES EXTRACTOR
// ============================================================================

export async function extractSpeedfiles(embedUrl: string): Promise<string | null> {
  try {
    const html = await fetchText(embedUrl);

    // Look for m3u8 source
    const m3u8Match = html.match(/["']([^"']*\.m3u8[^"']*)["']/);
    if (m3u8Match) {
      return m3u8Match[1].replace(/\\\//g, '/');
    }

    // Look for video source
    const sourceMatch = html.match(/file:\s*["']([^"']+)["']/);
    if (sourceMatch) {
      return sourceMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// UNIVERSAL EXTRACTOR - tries all hosters
// ============================================================================

export type HosterExtractor = {
  name: string;
  patterns: RegExp[];
  extract: (url: string) => Promise<string | null>;
};

export const hosterExtractors: HosterExtractor[] = [
  {
    name: 'voe',
    patterns: [/voe/i, /jefferycontrolmodel/i, /tube\.hu/i],
    extract: extractVoe,
  },
  {
    name: 'doodstream',
    patterns: [/dood/i, /ds2play/i],
    extract: extractDoodstream,
  },
  {
    name: 'vidmoly',
    patterns: [/vidmoly/i],
    extract: extractVidmoly,
  },
  {
    name: 'filemoon',
    patterns: [/filemoon/i, /moonembed/i],
    extract: extractFilemoon,
  },
  {
    name: 'lulustream',
    patterns: [/lulustream/i, /lulu/i],
    extract: extractLulustream,
  },
  {
    name: 'vidoza',
    patterns: [/vidoza/i],
    extract: extractVidoza,
  },
  {
    name: 'speedfiles',
    patterns: [/speedfiles/i, /speed-/i],
    extract: extractSpeedfiles,
  },
];

export function getExtractorForUrl(url: string, hosterName: string): HosterExtractor | null {
  const combined = `${url} ${hosterName}`.toLowerCase();

  for (const extractor of hosterExtractors) {
    for (const pattern of extractor.patterns) {
      if (pattern.test(combined)) {
        return extractor;
      }
    }
  }

  return null;
}

export async function extractDirectUrl(embedUrl: string, hosterName: string): Promise<{ url: string; hoster: string } | null> {
  const extractor = getExtractorForUrl(embedUrl, hosterName);

  if (!extractor) {
    return null;
  }

  try {
    const directUrl = await extractor.extract(embedUrl);
    if (directUrl) {
      return { url: directUrl, hoster: extractor.name };
    }
  } catch (error) {
    console.error(`Extraction failed for ${extractor.name}:`, error);
  }

  return null;
}