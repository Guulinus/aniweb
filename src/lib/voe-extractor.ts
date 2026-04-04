import https from 'https';
import http from 'http';
import { URL } from 'url';

async function fetchText(url: string, referer?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };
    if (referer) headers['Referer'] = referer;

    lib.get(url, { headers, timeout: 15000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location, url).then(resolve, reject);
      }
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function resolveUrl(base: string, relative: string): string {
  return new URL(relative, base).href;
}

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
  let url = embedUrl;
  let text = await fetchText(url);

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
}
