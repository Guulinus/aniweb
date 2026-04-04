import { NextRequest, NextResponse } from 'next/server';

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const ALLOWED_DOMAINS = new Set([
  'voe.sx',
  'voe-unblock.com',
  'voeunblk.com',
  'voeunbl0ck.com',
  'dood.ws',
  'dood.to',
  'dood.so',
  'dood.yt',
  'dood.li',
  'ds2play.com',
  'd000d.com',
  'vidmoly.to',
  'vidmoly.me',
  'filemoon.sx',
  'filemoon.to',
  'moonembed.to',
  'lulustream.com',
  'luluvdo.com',
  'vidoza.net',
  'vidoza.co',
  'speedfiles.org',
  'speedfile.cc',
]);

const AD_URL_PATTERNS = [
  'ads', 'ad.', 'ad_', 'advert', 'banner', 'popup', 'popunder',
  'googlesyndication', 'doubleclick', 'googleads', 'popads',
  'adserver', 'adnxs', 'criteo', 'taboola', 'outbrain',
  'revcontent', 'propellerads', 'exoclick', 'trafficjunky',
  'juicyads', 'exosrv', 'onclickads', 'pushno', 'pushengage',
  'onesignal', 'cloudscraper', 'cloudflarechallenge',
  'chaturbate', 'cam4', 'livejasmin', 'stripchat',
];

const PRIVATE_IP_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./i,
  /^https?:\/\/10\./i,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./i,
  /^https?:\/\/192\.168\./i,
  /^https?:\/\/169\.254\./i,
  /^https?:\/\/0\./i,
  /^https?:\/\/::1/i,
  /^https?:\/\/\[::1\]/i,
  /^file:/i,
  /^data:/i,
  /^javascript:/i,
];

function isAdUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return AD_URL_PATTERNS.some(pattern => lower.includes(pattern));
}

function isPrivateOrInternal(url: string): boolean {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(url));
}

function isAllowedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return ALLOWED_DOMAINS.has(hostname);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  if (isPrivateOrInternal(url)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (!isAllowedDomain(url)) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': new URL(url).origin,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch embed' }, { status: res.status });
    }

    let html = await res.text();
    const embedOrigin = new URL(url).origin;

    html = html.replace(/<script[^>]*src=["'][^"']*challenges\.cloudflare\.com[^"']*["'][^>]*><\/script>/gi, '');
    html = html.replace(/<div[^>]*class=["']cf-turnstile["'][^>]*>[\s\S]*?<\/div>/gi, '');
    html = html.replace(/window\._cf_chl_opt[^;]*;/gi, '');
    html = html.replace(/cf_chl_exec\([^)]*\);?/gi, '');

    html = html.replace(/<script[^>]*src=["'][^"']*(?:googlesyndication|doubleclick|popads|adserve|advertising|exoclick|propellerads|trafficjunky)[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');

    html = html.replace(/<script[^>]*>(?:[\s\S]*?)(?:popunder|popup|_pop\.|adsbygoogle|document\.write\(['"]<iframe|\.open\(['"]http[^"']*ads)[\s\S]*?<\/script>/gi, '');

    html = html.replace(/<iframe[^>]*src=["'][^"']*(?:ads?\.|googleads|doubleclick|popunder|popup|banner)[^"']*["'][^>]*>[\s\S]*?<\/iframe>/gi, '');

    html = html.replace(/<div[^>]*class=["'][^"']*(?:ad-|ads_|ad_|popup|popunder|banner-ad|overlay-ad|juicy|exoclick|propeller)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');

    const adBlockCode = `
    <script>
    (function() {
      var adDomains = [
        'googlesyndication.com','doubleclick.net','googleadservices.com',
        'adservice.google.com','pagead2.googlesyndication.com',
        'popads.net','popads.media','popadscdn.net',
        'adserver','adsystem','adnxs.com','ads-twitter.com',
        'amazon-adsystem.com','criteo.com','taboola.com',
        'outbrain.com','revcontent.com','propellerads.com',
        'exoclick.com','trafficjunky.com','juicyads.com',
        'exosrv.com','onclickads.net','pushno.com',
        'onesignal.com','cloudscraper',
        'chaturbate.com','cam4.com','livejasmin.com','stripchat.com'
      ];

      function isAd(url) {
        if (!url) return false;
        var l = url.toLowerCase();
        return adDomains.some(function(d) { return l.indexOf(d) !== -1; }) ||
               l.indexOf('/ads/') !== -1 || l.indexOf('popunder') !== -1 ||
               l.indexOf('popup') !== -1 || l.indexOf('ad.js') !== -1;
      }

      var _fetch = window.fetch;
      window.fetch = function() {
        var u = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url) || '';
        if (isAd(u)) return Promise.reject(new Error('blocked'));
        return _fetch.apply(this, arguments);
      };

      var _open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(m, u) {
        if (isAd(u)) throw new Error('blocked');
        return _open.apply(this, arguments);
      };

      var _createElement = document.createElement;
      document.createElement = function(tag) {
        var el = _createElement.apply(this, arguments);
        if (tag.toLowerCase() === 'script') {
          var _setSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
          if (_setSrc) {
            Object.defineProperty(el, 'src', {
              set: function(v) {
                if (isAd(v)) return;
                _setSrc.set.call(this, v);
              },
              get: function() { return _setSrc.get.call(this); }
            });
          }
        }
        return el;
      };

      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          m.addedNodes.forEach(function(node) {
            if (node.nodeType !== 1) return;
            if (node.tagName === 'IFRAME') {
              try { if (isAd(node.src)) { node.remove(); return; } } catch(e) {}
            }
            if (node.tagName === 'SCRIPT') {
              try { if (isAd(node.src)) { node.remove(); return; } } catch(e) {}
            }
            var c = (node.className || '').toLowerCase();
            var id = (node.id || '').toLowerCase();
            if (c.indexOf('ad') !== -1 || c.indexOf('pop') !== -1 ||
                c.indexOf('banner') !== -1 || id.indexOf('ad') !== -1 ||
                id.indexOf('pop') !== -1 || c.indexOf('cloudflare') !== -1 ||
                c.indexOf('turnstile') !== -1) {
              node.style.cssText = 'display:none!important;visibility:hidden!important;height:0!important;width:0!important;overflow:hidden!important;position:absolute!important;z-index:-9999!important;';
            }
          });
        });
      });

      function startObserver() {
        if (document.body) observer.observe(document.body, { childList: true, subtree: true });
      }
      if (document.body) startObserver();
      else document.addEventListener('DOMContentLoaded', startObserver);

      var adEls = document.querySelectorAll('[class*="ad"],[class*="pop"],[class*="banner"],[id*="ad"],[id*="pop"],[class*="cloudflare"],[class*="turnstile"]');
      adEls.forEach(function(el) {
        el.style.cssText = 'display:none!important;visibility:hidden!important;height:0!important;width:0!important;overflow:hidden!important;';
      });
    })();
    </script>`;

    const hideCSS = `
      <style>
        div[class*="ad-"], div[class*="ads_"], div[class*="popup"],
        div[class*="popunder"], div[class*="banner"], div[class*="overlay-ad"],
        div[id*="ad-"], div[id*="ads_"], div[id*="pop"],
        .ad, .ads, .advert, .advertisement, .ad-container,
        [class*="googleads"], [class*="doubleclick"],
        [class*="cloudflare"], [class*="turnstile"],
        .security-check, .challenge-card, .wrap, .card,
        div[class*="juicy"], div[class*="exoclick"],
        div[class*="propeller"], div[class*="popcash"],
        div[class*="cam4"], div[class*="chaturbate"],
        div[class*="livejasmin"], div[class*="stripchat"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
          position: absolute !important;
          z-index: -9999 !important;
        }
        body { margin: 0 !important; padding: 0 !important; }
        video, .video-player, .jwplayer, .player-container, #player, .player {
          display: block !important;
          visibility: visible !important;
        }
      </style>
    `;

    if (html.includes('</head>')) {
      html = html.replace('</head>', `${hideCSS}${adBlockCode}</head>`);
    } else {
      html = hideCSS + adBlockCode + html;
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'SAMEORIGIN',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy embed' },
      { status: 500 },
    );
  }
}
