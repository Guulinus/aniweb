<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AniRoll — German/English Anime Streaming Platform

## What Is This Project?

AniRoll is a self-hosted anime streaming site that:
- Fetches metadata from **AniList** (GraphQL API)
- Scrapes German streams from **AniWorld.to** (direct m3u8 extraction, NO iframes)
- Uses **TMDB** for episode thumbnails, durations, and film posters
- Supports **Filmpalast.to** and **Movie2k.ch** for the `/filme` section
- Has user accounts with JWT auth, watchlist sync, and watch progress tracking
- Targets a **Raspberry Pi** (linux-arm64) for production deployment

**Philosophy**: No ads, no iframe players, no DRM — direct stream extraction only. If a hoster fails, the user sees an error, not an ad page.

---

## Environment

### Machines
| Machine | IP | OS | Role |
|---------|----|----|------|
| Local dev | localhost | linux-x64 | Code + test |
| Pi | `192.168.178.84` | linux-arm64 | Production |

### Pi Access
```
sshpass -p 'Guulinus2' ssh pi@192.168.178.84
```

### API Keys (hardcoded in code, NOT env vars)
| Key | Where | Used For |
|-----|-------|----------|
| `TMDB_API_KEY=7a6f6473c46188721c31804f166eb53d` | `src/lib/tmdb-client.ts` | TMDB thumbnails, durations, film info |
| `AniList` | GraphQL endpoint, no key needed | Anime metadata |
| `AniWorld.to` | Scraper, no auth needed | German stream links |

---

## Project Structure

```
/home/sam/aniweb/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Homepage
│   │   ├── layout.tsx              # Root layout (providers, fonts, navbar/footer)
│   │   ├── globals.css             # Theme system, CSS vars, animations
│   │   ├── not-found.tsx           # 404 page
│   │   ├── anime/[slug]/page.tsx   # Anime detail page (AP)
│   │   ├── watch/[animeSlug]/[season]/[episode]/page.tsx  # Watch page (WP)
│   │   ├── search/page.tsx         # Search with input, skeleton loading
│   │   ├── browse/page.tsx         # Browse with genre/status/sort filters
│   │   ├── browse/page.tsx         # Browse with filters
│   │   ├── calendar/page.tsx       # Weekly anime calendar
│   │   ├── filmy/                  # Film section (isolated from anime)
│   │   │   ├── page.tsx            # Film landing
│   │   │   ├── browse/page.tsx     # Film browse
│   │   │   ├── [slug]/page.tsx     # Film detail
│   │   │   └── [slug]/watch/page.tsx # Film watch
│   │   ├── history/page.tsx        # Watch history
│   │   ├── login/page.tsx          # Login/register
│   │   ├── profile/[id]/page.tsx   # User profile
│   │   ├── settings/page.tsx       # Theme + language settings
│   │   ├── watchlist/page.tsx      # User watchlist
│   │   ├── seasonal/page.tsx       # Seasonal anime
│   │   ├── random/page.tsx         # Random anime redirect
│   │   └── api/                    # 37+ API routes (see API section)
│   ├── components/                 # 20 React components
│   ├── hooks/                      # 6 custom hooks
│   ├── lib/                        # 16 utility/context/client files
│   └── types/index.ts              # All TypeScript types
├── data/                           # Runtime data (gitignored)
│   ├── auth.json                   # User auth data
│   ├── user_{id}.json              # Per-user sync data
│   ├── anime.db                    # SQLite anime cache
│   └── avatars/                    # User avatar images
├── public/                         # Static assets
├── next.config.mjs                 # Next.js config (NOT .ts)
├── tailwind.config.js              # Tailwind config
├── tsconfig.json                   # TypeScript config (target: ES2017)
└── AGENTS.md                       # This file
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (`standalone` output) |
| Language | TypeScript (strict, target ES2017) |
| Styling | Tailwind CSS 3.4 |
| Font | Inter via `next/font/google` (`--font-inter` CSS var) |
| Video Player | Artplayer 5.4 + HLS.js 1.6 |
| Auth | JWT (`jose` 6.x) + bcryptjs + httpOnly cookies |
| Scraping | Custom `fetch`-based scraper (AniWorld, Filmpalast, Movie2k) |
| HTML Parsing | `cheerio` 1.2 + `jsdom` 29 (server-side only) |
| Cache | `node-cache` 5.1 (in-memory, 1h TTL for AniWorld pages) |
| Database | `better-sqlite3` (anime cache, synced from AniList every 12h) |
| Runtime | Node.js on Pi (systemd, `--max-old-space-size=384`) |

---

## Abbreviations

| Abbr | Page | Route |
|------|------|-------|
| **HP** | Homepage | `/` |
| **AP** | Anime Detail | `/anime/[slug]` |
| **WP** | Watch Page | `/watch/[animeSlug]/[season]/[episode]` |

---

## Key Components

### EpisodeList (`src/components/EpisodeList.tsx`)
The most complex shared component. Renders season tabs + episode grid on AP and WP.

**Props**: `animeSlug`, `aniworldSlug`, `animeId`, `seasons`, `defaultSeason`, `episodeThumbnails`, `episodeDurations`, `movies`, `movieSlugs`

**Tab logic**:
- Season 0 = "Filme" tab (AniWorld films + AniList movie relations)
- Seasons > 0 = "Staffel N" tabs
- `activeSeason` defaults to `defaultSeason || 1`
- `isFilmsTab = activeSeason === 0 || activeSeason === -1`

**Film card rendering**: TMDB poster from `/api/tmdb/film-info`, runtime in Std/Min format, no S0E1 label

**Episode card rendering**: TMDB thumbnail, S/E label, duration, watched checkmark, progress bar, "Weiterschauen" badge

**State**: Watch data from localStorage (`watched:{animeId}`, `lastWatched:{animeId}`, `watchPosition:{animeId}:{season}:{ep}`)

### HorizontalAnimeSection
- Card: `w-[180px]`, `aspect-[2/3]`, `rounded-xl`
- Hover: `scale-105`
- EP badge: `bg-black/60 backdrop-blur-sm rounded-md`
- Scroll: right button only, `opacity-0 group-hover/row:opacity-100`
- Uses `group/row` and `group/section` classes
- **Memoized** with `React.memo`

### VideoPlayer (`src/components/VideoPlayer.tsx`)
- Uses Artplayer (not native video)
- HLS.js for m3u8 streams with Referer injection
- Language buttons, server dropdown, quality dropdown
- Auto-advance next episode
- Skip intro/outro via AniSkip API
- Keyboard shortcuts overlay

### Skeleton Components (`src/components/Skeleton.tsx`)
- `SkeletonCard`, `SkeletonGrid`, `SkeletonText`, `SkeletonEpisodeGrid`, `SkeletonWatchPage`, `SkeletonBanner`
- All use **deterministic widths** (no `Math.random()` — causes hydration mismatches)
- Used as Suspense fallbacks on all pages

---

## Theme System

### Presets (`src/lib/SettingsContext.tsx`)
```typescript
THEME_PRESETS = {
  aniroll:      { primary: '#a855f7', hover: '#9333ea' },  // Purple (default)
  crunchyroll:  { primary: '#f97316', hover: '#ea580c' },  // Orange
  netflix:      { primary: '#e50914', hover: '#b20710' },  // Red
  emerald:      { primary: '#10b981', hover: '#059669' },  // Green
  sky:          { primary: '#0ea5e9', hover: '#0284c7' },  // Blue
  rose:         { primary: '#f43f5e', hover: '#e11d48' },  // Rose
  custom:       { primary: userColor, hover: computed },    // User-defined
}
```

### CSS Variables (set on `<html data-theme="...">`)
```css
--bg-primary: #0a0a0f          --bg-secondary: #111827
--color-primary: #a855f7       --color-primary-hover: #9333ea
--color-primary-soft: rgba(168, 85, 247, 0.2)
--color-primary-border: rgba(168, 85, 247, 0.3)
--color-primary-shadow: rgba(168, 85, 247, 0.25)
```

### Utility Classes
Use these for theme-aware styling: `.bg-theme-primary`, `.text-theme-primary`, `.bg-theme-hover`, `.border-theme-primary`, `.ring-theme-primary`, `.shadow-theme-primary`, `.bg-theme-soft`

### Flash Prevention
Layout has inline `<script>` that reads `localStorage.anirollSettings` and applies `data-theme` + CSS variables before first paint.

---

## Streaming Architecture

### Flow: Anime Detail → Watch Page → Video

```
1. AP loads → /api/aniworld/find?title=X → returns {slug, seasons[]}
2. User clicks episode → /watch/slug/season/episode
3. WP calls /api/aniworld/episode/slug/season/episode
4. Route handler:
   a. getEpisodeStreamLinks() → fetches AniWorld page, extracts <li data-lang-key data-link-id>
   b. resolveRedirect() for each link (parallel, 10s timeout each)
   c. extractDirectUrl() for each resolved URL (VOE, Vidmoly, etc.)
   d. checkHlsQuality() for m3u8 links
   e. Sort by: Language (Ger-Dub > Ger-Sub > Eng-Sub) > Quality > HLS > Hoster priority
5. VideoPlayer receives sorted links, auto-selects best
```

### Timeouts (CRITICAL)
| Layer | Timeout | Notes |
|-------|---------|-------|
| `fetchHtml` (AniWorld page) | **20s** | Per page fetch, NodeCache cached for 1h |
| `resolveRedirect` | **10s** | Per redirect, runs **in parallel** via `Promise.all` |
| `extractDirectUrl` (hoster) | **12s** | Per hoster, runs in parallel |
| Episode API total | **35s** | Global timeout for entire endpoint |
| `checkHlsQuality` | **5s** | m3u8 quality probe |

### AniWorld Scraper (`src/lib/aniworld-client.ts`)
- Uses `fetch` with browser-like headers (User-Agent, Accept, Accept-Language)
- `NodeCache` with 1h TTL for all fetched HTML pages
- `JSDOM` as fallback for HTML parsing when regex fails
- Season scraping is **parallel** (all season pages + films fetched via `Promise.all`)
- Link redirect resolution is **parallel** (`Promise.all`)

### Hoster Extractors (`src/lib/hosters.ts`, 630 lines)
10 extractors, each returns `{ url: string, hoster: string } | null`:

| Hoster | Method | Notes |
|--------|--------|-------|
| **VOE** | 7-step decode chain | ROT13 → junk removal → base64 → char shift -3 → reverse → base64 → JSON. Needs `Referer: https://voe.sx/` |
| **Vidmoly** | HTML extraction | Needs `Referer: https://vidmoly.to/` + `Cookie: cf_turnstile_demo_pass_{ID}=1` |
| **Vidara** | 3-domain parallel POST | `vidara.to`, `vidaraa.cc`, `vidara.so` |
| **DoodStream** | Token + pass_md5 | |
| **FileMoon** | HTML + packed script fallback | |
| **Lulustream** | Simple m3u8 extraction | |
| **Streamtape** | Video URL extraction | |
| **MixDrop** | Packed script unpack | |
| **Upstream** | Packed script unpack | |
| **Vinovo** | Simple m3u8 extraction | |

Uses raw `http`/`https` Node.js modules (not `fetch`). Has `unpack()` for `eval(function(p,a,c,k,e,d){...})` obfuscation.

---

## API Routes Reference

### AniList
| Route | Purpose |
|-------|---------|
| `/api/anilist/search?id=X` or `?q=X` | Search by title or ID |
| `/api/anilist/popular` | Popular anime |
| `/api/anilist/trending` | Trending anime |
| `/api/anilist/seasonal` | Current season |
| `/api/anilist/recommendations?id=X` | Recommendations by ID |
| `/api/anilist/browse?genre=X&status=X&sort=X` | Browse with filters |
| `/api/anilist/genres` | Genre list |
| `/api/anilist/calendar` | Weekly calendar |

### AniWorld (Scraper)
| Route | Purpose |
|-------|---------|
| `/api/aniworld/find?title=X&year=Y&english=Z` | Find anime → returns `{found, slug, seasons[]}` |
| `/api/aniworld/find-movie?title=X&year=Y` | Find movie → returns `{found, slug, season, episode}` |
| `/api/aniworld/search?title=X` | Search (returns season numbers, not objects) |
| `/api/aniworld/series/[slug]` | Full series info → `{available, seasons[]}` |
| `/api/aniworld/episode/[slug]/[season]/[episode]` | Stream links → `{links[], available}` |

### TMDB
| Route | Purpose |
|-------|---------|
| `/api/tmdb/thumbnails?romaji=X&english=Y&seasons=1,2,3` | Episode thumbnails per season |
| `/api/tmdb/episode-durations?tmdbId=X&season=N` | Per-episode runtime in minutes |
| `/api/tmdb/film-info?title=X&title=Y` | Film poster + runtime (in-memory cache 24h) |
| `/api/tmdb/posters?title=X` | Poster images |
| `/api/tmdb/trailer?tmdbId=X` | Trailer URL |

### Auth
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/register` | POST | Create user, set `aniroll_session` cookie |
| `/api/auth/login` | POST | Verify password, set cookie |
| `/api/auth/logout` | POST | Clear cookie |
| `/api/auth/me` | GET | Current user info |

### User
| Route | Purpose |
|-------|---------|
| `/api/user/sync` | GET/POST push/pull watchlist, positions, history |
| `/api/user/avatar` | POST upload avatar |
| `/api/user/avatar/[userId]` | GET serve avatar |
| `/api/user/profile` | GET/POST own profile |
| `/api/user/profile/[id]` | GET other user profile |

### Films (Filmpalast + Movie2k)
| Route | Purpose |
|-------|---------|
| `/api/filmpalast/categories` | Film categories from filmpalast.to |
| `/api/filmpalast/search?q=X` | Search films |
| `/api/filmpalast/movie/[slug]` | Film details |
| `/api/filmpalast/stream/[...id]` | Film stream links |

### Other
| Route | Purpose |
|-------|---------|
| `/api/aniskip/[malId]/[episode]` | Skip intro/outro timings |
| `/api/kitsu/covers?ids=X,Y` | Kitsu cover images |
| `/api/proxy/embed?url=X` | Proxy embed pages |

---

## Auth System

- **JWT** via `jose`, signed with secret from `src/lib/auth.ts`
- **Cookie**: `aniroll_session`, httpOnly, path `/`, sameSite `lax`, 30 day expiry
- **Storage**: File-based (`data/auth.json`, `data/user_{id}.json`)
- **Gate**: `AuthGate` component shows spinner until auth check completes
- **Sync**: On login/register, `syncAfterLogin()` pushes local watchlist to server. On mount, `pullServerData()` fetches merged data.
- **Merge strategy**: watchlist by animeId (newer wins), positions by key (newer wins), history union

### Sync Architecture
```
Client → Server: syncAfterLogin() on login/register
Server merge: mergeSyncData() — watchlist by animeId (newer wins)
Server → Client: pullServerData() GETs merged data
Data: data/auth.json, data/user_{id}.json
```

---

## Type Definitions (`src/types/index.ts`)

Key types:
- `AnimeBasic` — id, title, coverImage, format, status, episodes, genres
- `AnimeDetail extends AnimeBasic` — description, relations, bannerImage
- `AniworldSeason` — `{ seasonNumber: number, episodes: [{number, title, slug}] }`
- `StreamLink` — `{ hoster, url, language?, hasAds?, quality? }`
- `WatchlistEntry` — `{ animeId, animeSlug, title, coverImage, status, currentEpisode?, aniworldSlug? }`
- `RelatedMovie` — `{ id, title, coverImage?, year?, relationType }`
- `ThemeSettings` — `{ theme: 'aniroll'|'crunchyroll'|'netflix'|'emerald'|'sky'|'rose'|'custom', customColor: string }`
- `FilmInfo` (local to EpisodeList) — `{ posterImage, runtimeMinutes, year }`

---

## Build & Deploy

### Build
```bash
cd /home/sam/aniweb
npm run build
```
Output: `.next/` with `standalone/` server.

### Deploy to Pi
```bash
# 1. Sync .next directory
rsync -av --timeout=60 .next/ pi@192.168.178.84:aniweb/.next/

# 2. Fix standalone (CRITICAL: must rm -rf first, cp doesn't overwrite changed files)
sshpass -p 'Guulinus2' ssh pi@192.168.178.84 \
  'rm -rf /home/pi/aniweb/.next/standalone/.next/static && \
   cp -r /home/pi/aniweb/.next/static /home/pi/aniweb/.next/standalone/.next/static && \
   cp -r /home/pi/aniweb/public /home/pi/aniweb/.next/standalone/public 2>/dev/null && \
   cp /home/pi/aniweb/.next/BUILD_ID /home/pi/aniweb/.next/standalone/.next/BUILD_ID && \
   fuser -k 3000/tcp 2>/dev/null; sleep 2; \
   cd /home/pi/aniweb/.next/standalone && nohup node server.js > ~/aniweb.log 2>&1 &'

# 3. Verify
sleep 3 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

### Deploy Rules
- **ALWAYS `rm -rf` standalone `.next/static` BEFORE `cp -r`** — otherwise old files aren't overwritten
- **ALWAYS copy BUILD_ID** — matches standalone to the right build
- **Kill existing server** before starting new one (`fuser -k 3000/tcp`)
- **Test locally first** (see Testing section), only deploy to Pi after local success
- **Verify with curl** after deploy: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`

### Testing

**You CANNOT test streaming locally** — AniWorld is unreachable from the dev machine (DNS/network issues). The `find` and `episode` API calls will fail locally. **Always deploy to Pi for streaming tests.**

**What you CAN test locally**:
- `npm run build` — must succeed without errors
- Page rendering, component logic, theme system
- AniList API calls (these work locally)
- TypeScript compilation

**Pi streaming test commands**:
```bash
# Test find API
curl -s --max-time 30 "http://192.168.178.84:3000/api/aniworld/find?title=Jujutsu+Kaisen&year=2020&english=JUJUTSU+KAISEN"

# Test episode streams
curl -s --max-time 50 "http://192.168.178.84:3000/api/aniworld/episode/jujutsu-kaisen/1/1"

# Test multiple episodes across different anime
for ep in "jujutsu-kaisen/1/1" "attack-on-titan/1/1" "demon-slayer-kimetsu-no-yaiba/1/1"; do
  curl -s --max-time 50 "http://192.168.178.84:3000/api/aniworld/episode/$ep" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(f'$ep: links={len(d.get(\"links\",[]))}')"
done

# Test page loads
curl -s -o /dev/null -w "%{http_code}" "http://192.168.178.84:3000/anime/jujutsu-kaisen?id=113415"
curl -s -o /dev/null -w "%{http_code}" "http://192.168.178.84:3000/watch/jujutsu-kaisen/1/1?id=113415"
```

---

## Common Gotchas & Debugging

### Build Issues
- **`Cannot find module './1682.js'`** or similar chunk errors = stale `.next` cache. Fix: `rm -rf .next && npm run build`
- **Dev server on same port** can overwrite `.next/` and cause issues. Always kill dev server before building: `fuser -k 3000/tcp`
- **`cp -r` doesn't overwrite** different-hashed files in standalone. Must `rm -rf` first.

### Streaming Issues
- **"Episode fetch timed out"** — AniWorld pages are slow (especially for popular anime like JJK). If timeout is hit, increase both the route-level timeout AND ensure redirects are parallel
- **`available: false, links: 0`** — AniWorld might have removed the anime, or the HTML structure changed
- **`fetch failed`** — Network issue between Pi and AniWorld.to. Check Pi DNS (`/etc/resolv.conf` should have `8.8.8.8`)
- **VOE links not resolving** — VOE uses aggressive anti-bot. The 7-step decode might need updating if they change obfuscation

### AniWorld Scraper
- Pages are cached in `NodeCache` for 1h — if you fix a scraping bug, the fix won't apply to cached pages until TTL expires
- `fetchHtml` uses browser-like headers but AniWorld has Cloudflare — may intermittently fail
- Season pages are fetched **in parallel** via `Promise.all` (capped implicitly by number of seasons)
- Film titles are fetched with concurrency of 3

### React/Next.js
- **No `Math.random()` in components** — causes hydration mismatches. Use deterministic values.
- **`key={anime.id}`** on EpisodeList forces remount when anime changes
- **localStorage** must be wrapped in `typeof window === 'undefined'` checks
- **`useCallback`/`useMemo`** on expensive computations (episode click handlers, progress calculations)
- **Suspense boundaries** with skeleton fallbacks on all pages

### Authentication
- `req.cookies.get()` returns empty in standalone mode — use `cookies()` from `next/headers`
- Cookie name: `aniroll_session`
- AuthGate blocks rendering until auth check completes

### Timeouts (Recap)
| What | Timeout | Where |
|------|---------|-------|
| AniWorld page fetch | 20s | `aniworld-client.ts` `fetchHtml()` |
| Redirect resolution | 10s each, parallel | `aniworld-client.ts` `resolveRedirect()` |
| Hoster extraction | 12s each, parallel | `episode/[...id]/route.ts` |
| HLS quality check | 5s | `episode/[...id]/route.ts` |
| Total episode API | 35s | `episode/[...id]/route.ts` |

---

## Navigation & Layout

### Navbar
- Fixed: `top-0 left-0 right-0 z-50`
- Background: `bg-[#0a0a0f]/80 backdrop-blur-md`
- Container: `max-w-[1400px] mx-auto px-4 lg:px-8`
- Text: `text-[15px]`, logo: `text-xl`, links: `px-3.5 py-2.5`
- Mobile: hamburger menu with search icon
- Avatar: `ring-2 ring-white/10` with dropdown chevron

### Footer
- Background: `bg-[#060609]`, border: `border-white/[0.04]`
- **Hidden** on `/watch/` and `/filme/*/watch` routes (via `WatchPageLayout.tsx`)
- ARIA labels on social links

### Containers
- HP: `max-w-[1400px] mx-auto`
- AP: `max-w-7xl mx-auto px-4`

---

## Cover Image Strategy

- **AniList `extraLarge`** (~225x318px) used directly for ALL HP anime covers. **NO TMDB poster replacement on HP** (user reverted — IMDB posters were wrong artwork)
- **TMDB `w500`** for episode thumbnails and `w780` for film posters/banners
- **Weiterschauen** covers prefer `anime.coverImage.large` over `entry.coverImage` (the latter is often lower quality, saved at add-time)

---

## i18n (Language Support)

- Two languages: **German (de)** and **English (en)**
- Hook: `useLanguage()` from `src/hooks/useLanguage.tsx`
- Pattern: `const { language } = useLanguage(); return language === 'de' ? 'Deutsch' : 'English';`
- Stored in localStorage key `anirollLang`
- All UI text is inline-conditional, no translation files

---

## Watchlist

- Stored in localStorage key `watchlist` (array of `WatchlistEntry`)
- CRUD via `useWatchlist()` hook: `add`, `remove`, `updateStatus`, `updateProgress`, `isInWatchlist`, `getEntry`
- Synced to server via `syncAfterLogin()` / `pullServerData()`
- Merge strategy: watchlist by animeId (newer wins)

---

## Provider Hierarchy (layout.tsx)

```
ErrorBoundary
  └─ SettingsProvider          (theme + language prefs)
    └─ AuthProvider            (JWT auth state)
      └─ LanguageProvider      (DE/EN UI language)
        └─ TVNavigationWrapper (D-pad remote control)
          └─ ToastProvider     (notification system)
            └─ AuthGate        (loading spinner gate)
              ├─ Navbar
              ├─ {children}
              └─ Footer (conditionally hidden via WatchPageLayout)
```

---

## Important Notes

- **NEVER use `fetch` library** — the project uses raw `http`/`https` Node.js modules for hoster extraction
- **`regex /s` flag not supported** at ES2017 target — use `[\s\S]` instead
- **AniList rate limiting**: ~90 req/min — retry logic is built into `anilist.ts`
- **Pi systemd**: `LimitNOFILE=4096`, `NODE_OPTIONS=--max-old-space-size=384`
- **Pi DNS**: `/etc/resolv.conf` set to `8.8.8.8` + `8.8.4.4` + `192.168.178.6`
- **Backup location**: `/home/sam/aniweb-back` (source only, no node_modules/.next/.git/data)
- **Git remote**: `https://github.com/Guulinus/aniweb.git` (branch: main)
- **Push with PAT**: `git push https://<PAT>@github.com/Guulinus/aniweb.git main` (ask user for PAT, NEVER hardcode)
- **NEVER commit secrets** — GitHub push protection will block it
- **`images.unoptimized: true`** — Pi ARM64 lacks `sharp`
- **`serverExternalPackages: ['jsdom', 'cheerio']`** — must be in next.config.mjs
- **`next.config.mjs`** (NOT `.ts`)
