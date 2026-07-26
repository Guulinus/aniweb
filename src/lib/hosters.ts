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

    const urlObj = new URL(url);
    const options: any = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https') ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      headers,
      timeout: 15000,
      family: 4,
    };

    const req = lib.get(options, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        fetchText(redirectUrl, referer).then(resolve).catch(reject);
        return;
      }
      let body = '';
      res.on('data', (chunk: string) => (body += chunk));
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function resolveUrl(base: string, relative: string): string {
  return new URL(relative, base).href;
}

async function postJson<T>(url: string, body: Record<string, string>, referer?: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(data).toString(),
    };
    if (referer) {
      headers['Referer'] = referer;
      headers['Origin'] = new URL(referer).origin;
    }
    const options: any = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https') ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers,
      timeout: 15000,
      family: 4,
    };
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk: string) => (body += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ============================================================================
// VIDARA EXTRACTOR (API-based, no ads!)
// ============================================================================

const VIDARA_DOMAINS = ['https://vidara.to', 'https://vidaraa.cc', 'https://vidara.so'];

async function extractVidara(embedUrl: string): Promise<string | null> {
  try {
    const urlObj = new URL(embedUrl);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const filecode = pathParts[pathParts.length - 1];
    if (!filecode) return null;

    const results = await Promise.allSettled(
      VIDARA_DOMAINS.map(async (domain) => {
        const data = await postJson<{ streaming_url?: string }>(
          `${domain}/api/stream`,
          { filecode, device: 'web' },
          embedUrl
        );
        if (data?.streaming_url && data.streaming_url.startsWith('http')) {
          return data.streaming_url;
        }
        return null;
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) return r.value;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// VOE EXTRACTOR (7-step decode)
// ============================================================================

function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function removeJunk(str: string): string {
  const junk = ['@$', '^^', '~@', '%?', '*~', '!!', '#&'];
  let result = str;
  for (const j of junk) {
    result = result.replaceAll(j, '_');
  }
  return result.replace(/_/g, '');
}

function shiftBack(str: string, amount: number): string {
  return Array.from(str).map((c) => String.fromCharCode(c.charCodeAt(0) - amount)).join('');
}

function voeDecode7Step(encoded: string): string | null {
  try {
    const step1 = rot13(encoded);
    const step2 = removeJunk(step1);
    const step3 = Buffer.from(step2, 'base64').toString('utf-8');
    const step4 = shiftBack(step3, 3);
    const step5 = step4.split('').reverse().join('');
    const step6 = Buffer.from(step5, 'base64').toString('utf-8');
    const json = JSON.parse(step6);
    if (json.source) return json.source as string;
    if (json.video_urls && Array.isArray(json.video_urls) && json.video_urls.length > 0) {
      return json.video_urls[0].file || json.video_urls[0].hls || null;
    }
    if (json.fallback && Array.isArray(json.fallback) && json.fallback.length > 0) {
      return json.fallback[0].file || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function extractVoe(embedUrl: string): Promise<string | null> {
  try {
    let html = await fetchText(embedUrl);

    const redirectMatch = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
    if (redirectMatch) {
      const redirectUrl = redirectMatch[1].startsWith('http')
        ? redirectMatch[1]
        : new URL(redirectMatch[1], embedUrl).href;
      html = await fetchText(redirectUrl, embedUrl);
    }

    const encodedPatterns = [
      /MKGMa\s*=\s*["']([A-Za-z0-9+/$%@^~!*#&=_-]+)["']/,
      /var\s+a168c\s*=\s*['"]([A-Za-z0-9+/$%@^~!*#&=_-]+)['"]/,
      /<script type="application\/json"[^>]*>([^<]{50,})<\/script>/,
    ];

    for (const pattern of encodedPatterns) {
      const match = html.match(pattern);
      if (match) {
        const decoded = voeDecode7Step(match[1].trim());
        if (decoded) return decoded;
      }
    }

    const packedMatch = html.match(/<script[^>]*>eval\(function\(p,a,c,k,e,d\)[^<]*<\/script>/);
    if (packedMatch) {
      const packed = packedMatch[0].replace(/<\/?script[^>]*>/g, '');
      const unpacked = unpack(packed);
      if (unpacked) {
        const encoded2 = unpacked.match(/MKGMa\s*=\s*["']([A-Za-z0-9+/$%@^~!*#&=_-]+)["']/);
        if (encoded2) {
          const decoded = voeDecode7Step(encoded2[1].trim());
          if (decoded) return decoded;
        }
        const ctMatch = unpacked.match(/const\s+ct\s*=\s*"([^"]+)"/);
        const lutsMatch = unpacked.match(/const\s+luts\s*=\s*"([^"]+)"/);
        if (ctMatch && lutsMatch) {
          const decoded = voeDecodeLegacy(ctMatch[1], lutsMatch[1]);
          if (decoded.hls) return decoded.hls as string;
          if (decoded.video_urls) {
            const urls = decoded.video_urls as Array<{ file: string }>;
            if (urls?.length > 0) return urls[0].file;
          }
        }
        const streamMatch = unpacked.match(/"(https?:[^"]*\.m3u8[^"]*)"/);
        if (streamMatch) return streamMatch[1];
      }
    }

    const streamMatch = html.match(/"(https?:[^"]*\.m3u8[^"]*)"/);
    if (streamMatch) return streamMatch[1];

    return null;
  } catch {
    return null;
  }
}

function voeDecodeLegacy(ct: string, lutsStr: string): Record<string, unknown> {
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

  let result = txt;
  for (let i = 0; i < lut.length; i++) {
    result = result.replace(new RegExp(lut[i], 'g'), String(i));
  }

  const replaced = result.replace(/[a-z]+/gi, (match) => {
    return String.fromCharCode(parseInt(match, 36));
  });

  const jsonLike = replaced.replace(/'/g, '"').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  try {
    return JSON.parse(jsonLike);
  } catch {
    return {};
  }
}

function unpack(str: string): string | null {
  try {
    const m = str.match(/}\('(.+)',(\d+),(\d+),'([^']+)'\.split/);
    if (!m) return null;
    const [, p, a, c, k] = m;
    return unpackRaw(p, parseInt(a), parseInt(c), k.split('|'));
  } catch {
    return null;
  }
}

function unpackRaw(p: string, a: number, c: number, k: string[]): string {
  function e(c: number): string {
    if (c < a) {
      const base = a < 36 ? 36 : 62;
      return c.toString(base);
    }
    return e(Math.floor(c / a)) + e(c % a);
  }

  let d: Record<string, string> = {};
  while (c--) {
    d[e(c)] = k[c] || String(c);
  }

  return p.replace(/\b\w+\b/g, (word) => d[word] || word);
}

// ============================================================================
// DOODSTREAM EXTRACTOR
// ============================================================================

async function extractDoodstream(embedUrl: string): Promise<string | null> {
  try {
    const passMd5Match = embedUrl.match(/\/d\/([a-zA-Z0-9]+)/);
    if (!passMd5Match) return null;

    const fileId = passMd5Match[1];
    
    // Try to get the token from the embed page
    const embedPage = await fetchText(embedUrl);
    
    // Try multiple patterns for token extraction
    const tokenPatterns = [
      /\$\.get\('([^']+)'\)/,
      /token\s*[:=]\s*['"]([^'"]+)['"]/,
      /\/pass_md5\?([^'"]+)/,
    ];
    
    let passUrl = '';
    for (const pattern of tokenPatterns) {
      const match = embedPage.match(pattern);
      if (match) {
        passUrl = match[1];
        break;
      }
    }

    if (passUrl) {
      if (!passUrl.startsWith('http')) {
        const embedOrigin = new URL(embedUrl).origin;
        passUrl = resolveUrl(embedOrigin, passUrl);
      }
      
      const passPage = await fetchText(passUrl, embedUrl);
      const directMatch = passPage.match(/(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/);
      if (directMatch) return directMatch[1];
    }

    // Fallback: look for any direct URL in embed page
    const anyMatch = embedPage.match(/(https?:\/\/[^"'\s]+(?:\.mp4|m3u8)[^"'\s]*)/);
    if (anyMatch) return anyMatch[1];

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// VIDMOLY EXTRACTOR
// ============================================================================

async function extractVidmoly(embedUrl: string): Promise<string | null> {
  try {
    const embedId = embedUrl.match(/embed-([a-zA-Z0-9]+)/)?.[1] || '';
    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      'Referer': embedUrl,
      'Origin': new URL(embedUrl).origin,
      'Sec-Fetch-Dest': 'document',
    };
    if (embedId) {
      headers['Cookie'] = `cf_turnstile_demo_pass_${embedId}=1`;
    }

    let html = '';
    await new Promise<void>((resolve, reject) => {
      const urlObj = new URL(embedUrl);
      const lib = urlObj.protocol === 'https:' ? https : http;
      const req = lib.get({
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        headers,
        timeout: 15000,
        family: 4,
      }, (res) => {
        let body = '';
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => { html = body; resolve(); });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });

    const sourcesMatch = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*['"]([^'"]+)/);
    if (sourcesMatch) return sourcesMatch[1];

    const fileMatch = html.match(/file\s*:\s*['"]([^'"]+?\.m3u8[^'"]*)['"]/);
    if (fileMatch) return fileMatch[1];

    const m3u8Match = html.match(/(https?:\/\/[^"'\s]*\.m3u8[^"'\s]*)/);
    if (m3u8Match) return m3u8Match[1];

    const mp4Match = html.match(/(https?:\/\/[^"'\s]*\.mp4[^"'\s]*)/);
    if (mp4Match) return mp4Match[1];

    const packedMatch = html.match(/<script[^>]*>eval\(function\(p,a,c,k,e,d\)[^<]*<\/script>/);
    if (packedMatch) {
      const packed = packedMatch[0].replace(/<\/?script[^>]*>/g, '');
      const unpacked = unpack(packed);
      if (unpacked) {
        const sourcesInPacked = unpacked.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*['"]([^'"]+)/);
        if (sourcesInPacked) return sourcesInPacked[1];
        const streamMatch = unpacked.match(/(https?:\/\/[^"'\s]*\.m3u8[^"'\s]*)/);
        if (streamMatch) return streamMatch[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// FILEMOON EXTRACTOR
// ============================================================================

async function extractFilemoon(embedUrl: string): Promise<string | null> {
  try {
    const html = await fetchText(embedUrl);
    
    const mp4Match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)/);
    if (mp4Match) return mp4Match[1];

    const m3u8Match = html.match(/(https?:\/\/[^"'\s]*\.m3u8[^"'\s]*)/);
    if (m3u8Match) return m3u8Match[1];

    const packedMatch = html.match(/<script[^>]*>eval\(function\(p,a,c,k,e,d\)[^<]*<\/script>/);
    if (packedMatch) {
      const packed = packedMatch[0].replace(/<\/?script[^>]*>/g, '');
      const unpacked = unpack(packed);
      if (unpacked) {
        const fileMatch = unpacked.match(/file\s*:\s*["'](https?:\/\/[^"']+)/);
        if (fileMatch) return fileMatch[1];
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

async function extractLulustream(embedUrl: string): Promise<string | null> {
  try {
    const html = await fetchText(embedUrl);
    
    const m3u8Match = html.match(/(https?:\/\/[^"'\s]*\.m3u8[^"'\s]*)/);
    if (m3u8Match) return m3u8Match[1];
    
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// STREAMTAPE EXTRACTOR
// ============================================================================

async function extractStreamtape(embedUrl: string): Promise<string | null> {
  try {
    const html = await fetchText(embedUrl);
    const match = html.match(/(https?:\/\/[^"'\s]*(?:streamtape|tapedott)[^"'\s]*\/video[^"'\s]*)/);
    if (match) return match[1];
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// MIXDROP EXTRACTOR
// ============================================================================

async function extractMixdrop(embedUrl: string): Promise<string | null> {
  try {
    const html = await fetchText(embedUrl);
    
    const packedMatch = html.match(/<script[^>]*>eval\(function\(p,a,c,k,e,d\)[^<]*<\/script>/);
    if (packedMatch) {
      const packed = packedMatch[0].replace(/<\/?script[^>]*>/g, '');
      const unpacked = unpack(packed);
      if (unpacked) {
        const fileMatch = unpacked.match(/(?:file|src)\s*[=:]\s*["'](https?:\/\/[^"']+)/);
        if (fileMatch) return fileMatch[1];
      }
    }

    const srcMatch = html.match(/(?:file|src)\s*[=:]\s*["'](https?:\/\/[^"']+)/);
    if (srcMatch) return srcMatch[1];
    
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// UPSTREAM EXTRACTOR
// ============================================================================

async function extractUpstream(embedUrl: string): Promise<string | null> {
  try {
    const html = await fetchText(embedUrl);
    
    const packedMatch = html.match(/<script[^>]*>eval\(function\(p,a,c,k,e,d\)[^<]*<\/script>/);
    if (packedMatch) {
      const packed = packedMatch[0].replace(/<\/?script[^>]*>/g, '');
      const unpacked = unpack(packed);
      if (unpacked) {
        const m3u8Match = unpacked.match(/(https?:\/\/[^"'\s]*\.m3u8[^"'\s]*)/);
        if (m3u8Match) return m3u8Match[1];
      }
    }

    const m3u8Match = html.match(/(https?:\/\/[^"'\s]*\.m3u8[^"'\s]*)/);
    if (m3u8Match) return m3u8Match[1];
    
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// VINOVO EXTRACTOR
// ============================================================================

async function extractVinovo(embedUrl: string): Promise<string | null> {
  try {
    const html = await fetchText(embedUrl);
    
    const m3u8Match = html.match(/(https?:\/\/[^"'\s]*\.m3u8[^"'\s]*)/);
    if (m3u8Match) return m3u8Match[1];
    
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// EXTRACTOR REGISTRY
// ============================================================================

interface HosterExtractor {
  name: string;
  patterns: RegExp[];
  extract: (embedUrl: string) => Promise<string | null>;
}

export const hosterExtractors: HosterExtractor[] = [
  {
    name: 'vidara',
    patterns: [/vidara/i],
    extract: extractVidara,
  },
  {
    name: 'voe',
    patterns: [/voe\.sx/i, /voe\.to/i, /ellenpoliticalfollow/i, /matthewhotelscience/i],
    extract: extractVoe,
  },
  {
    name: 'doodstream',
    patterns: [/dood/i, /d-s\.io/i, /d000d\.com/i],
    extract: extractDoodstream,
  },
  {
    name: 'vidmoly',
    patterns: [/vidmoly/i],
    extract: extractVidmoly,
  },
  {
    name: 'filemoon',
    patterns: [/filemoon/i],
    extract: extractFilemoon,
  },
  {
    name: 'lulustream',
    patterns: [/lulustream/i],
    extract: extractLulustream,
  },
  {
    name: 'streamtape',
    patterns: [/streamtape/i],
    extract: extractStreamtape,
  },
  {
    name: 'mixdrop',
    patterns: [/mixdrop/i],
    extract: extractMixdrop,
  },
  {
    name: 'upstream',
    patterns: [/upstream/i],
    extract: extractUpstream,
  },
  {
    name: 'vinovo',
    patterns: [/vinovo/i],
    extract: extractVinovo,
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
