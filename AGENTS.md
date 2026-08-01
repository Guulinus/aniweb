<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project: AniRoll – German/English anime streaming site

### Tech Stack
- Next.js 14, TypeScript, Tailwind CSS, standalone output
- AniList GraphQL API (metadata), TMDB API (thumbnails), IMDB suggestion API (cover posters)
- AniWorld.to scraper (German streams via hosters: VOE, Vidmoly)
- Auth: JWT (jose) + bcryptjs + cookie-based sessions
- SQLite for local DB sync (better-sqlite3), file-based auth (data/auth.json, data/user_{id}.json)

### Constraints
- Pi password: `Guulinus2` · Pi IP: `192.168.178.84` · Pi: linux-arm64 · Local: linux-x64
- User tests locally first, only deploys to Pi after local success
- `images.unoptimized: true` because Pi ARM64 lacks `sharp`
- `serverExternalPackages`: `cheerio`, `jsdom`
- `next.config.mjs` (NOT `.ts`)
- Footer hidden on `/watch/` and `/filme/*/watch` routes
- **No ads** — direct m3u8/mp4 extraction only, no iframe fallbacks

### Abbreviations
- **HP** = Homepage (`/`)
- **AP** = Anime detail page (`/anime/[slug]`)
- **WP** = Watch page (`/watch/[animeSlug]/[season]/[episode]`)

### Navigation Design
- Navbar: `fixed top-0 left-0 right-0 z-50`, solid `bg-[#0a0a0f]`, container `max-w-[1400px] mx-auto px-4 lg:px-8`
- Mobile search icon in navbar (not separate hero search bar)
- Nav text `text-[15px]`, logo `text-xl`, nav links `px-3.5 py-2.5`
- Avatar: `ring-2 ring-white/10` with dropdown chevron

### Homepage (HP)
- Static hero background image (`/hero-bg.jpg`), NO anime carousel
- Hero: `pt-14 md:pt-16` (navbar overlap), `mb-14`, content `justify-end` with `pb-12`
- Max container: `max-w-[1400px] mx-auto`
- Each section fetches independently (no cascade)
- **IMDB covers**: `PosterSection` component wraps `HorizontalAnimeSection`, fetches IMDB posters via `/api/imdb/posters` after initial render. Global `posterCache` prevents duplicate API calls. AniList covers shown immediately, IMDB SX500 posters (~500x700px) replace them client-side.
- Sections: Weiterschauen, Beliebt, Trend, Seasonal, Neu auf AniRoll, Für dich empfohlen, Genre rows
- Last section named "Für dich empfohlen"
- Skeleton section at bottom (6 placeholders, auto-hides after 8s)
- Horror genre excluded from all homepage sections

### HorizontalAnimeSection (shared component)
- Card width: `w-[180px]`, `aspect-[2/3]`, `rounded-xl`
- Hover: `scale-105`, `group-hover:ring-white/[0.08]`
- EP badge: `bg-black/60 backdrop-blur-sm rounded-md`, `flex items-center leading-none`
- Scroll: ONLY right button, `opacity-0 group-hover/row:opacity-100`
- Scroll button: `bg-[#16161f]/90 hover:bg-[#1f1f2e] shadow-xl shadow-black/40 border border-white/[0.06] backdrop-blur-sm`, size `w-11 h-11`
- "Alle anzeigen" link: `opacity-0 group-hover/section:opacity-100`
- Section title: `text-lg md:text-xl`
- Right fade: `w-20`
- Uses `group/row` and `group/section` classes
- Props: `posters?: Map<number, string>` for IMDB cover overrides
- Cover images: AniList `extraLarge` fallback, upgraded to IMDB SX500 via PosterSection

### Anime Detail Page (AP)
- Cover: AniList `coverImage.large`
- Badges: format, episodes (EP), year, status — NO score badge, NO star rating
- Genres: `flex flex-wrap gap-2 mb-5`, each tag `flex items-center` for vertical centering
- Watchlist button: SVG checkmark icon only (no duplicate ✓ text)
- Relations displayed as cards below main info

### Watch Page (WP)
- Back link above title: "← Zurück zum Anime"
- Title + episode name under S/E number
- **Episode list dropdown**: Toggle button "▾ Episoden (N)" with animated open/close (`maxHeight` transition, `duration-300`)
- Inside dropdown: Season tabs (`flex flex-wrap gap-2 mb-5`) + Episode grid (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3`) — always 4 per row max
- Active season tab: `bg-theme-primary text-white`
- **TMDB thumbnails**: Separate useEffect fetches per-season thumbnails via `/api/tmdb/thumbnails`. Re-fetches when `displaySeason` or `animeTitle` changes. Uses `animeTitleRef.current` to avoid stale closure issues.
- `pb-32` bottom padding to avoid bottom bar overlap
- Auto-quality selection: Language priority Ger-Dub > Ger-Sub > Eng-Sub, then m3u8 > mp4, then resolution

### VideoPlayer
- Autoplay, language buttons, Server dropdown (hoster list per language)
- Auto quality dropdown with quality options ("Auto (Best)", specific resolutions)
- HLS.js Referer injection: Vidmoly `https://vidmoly.to/`, VOE `https://voe.sx/`
- Keyboard shortcuts hint with `backdrop-blur-sm`

### Watchlist Page
- Season dropdown + expandable episode grid with TMDB thumbnails
- 4-column grid, animated open/close
- "Weiterschauen →" link per entry
- `pb-24` bottom spacing

### Film Section (`/filme`)
- Fully redesigned, isolated section with own landing, detail, and watch pages
- FilmCard, HorizontalMovieSection, MovieGrid components

### Auth System
- `src/lib/auth.ts`: JWT sign/verify (`jose`), password hash/verify (`bcryptjs`)
- Cookie: `aniroll_session`, httpOnly, path `/`, sameSite `lax`, 30d
- `req.cookies.get()` returns empty in standalone; use `cookies()` from `next/headers`
- AuthGate: Simple circle spinner loading screen (`border-t-theme-primary rounded-full animate-spin`)
- Loading screen blocks page until auth completes

### Sync Architecture
- Client → Server: `syncAfterLogin()` on login/register
- Server merge: `mergeSyncData()` — watchlist by animeId (newer wins), positions by key (newer wins), history union
- Server → Client: `pullServerData()` GETs merged data
- Data files: `data/auth.json`, `data/user_{id}.json`, `data/avatars/{userId}.{ext}`

### API Routes
| Route | Purpose |
|---|---|
| `POST /api/auth/register` | Creates user, sets cookie |
| `POST /api/auth/login` | Verifies password, sets cookie |
| `POST /api/auth/logout` | Clears cookie |
| `GET /api/auth/me` | Returns current user |
| `GET/POST /api/user/sync` | Push/pull watchlist, positions, history |
| `POST /api/user/avatar` | Upload avatar |
| `GET /api/user/avatar/[userId]` | Serve avatar |
| `GET /api/anilist/popular` | Popular anime (DB or AniList) |
| `GET /api/anilist/trending` | Trending anime (DB or AniList) |
| `GET /api/anilist/seasonal` | Current season anime |
| `GET /api/anilist/recommendations` | Recommendations by anime ID |
| `GET /api/anilist/browse` | Browse with genre/status/sort filters |
| `GET /api/anilist/search` | Search anime by title or ID |
| `GET /api/anilist/genres` | Genre list |
| `GET /api/anilist/season-mal` | MAL ID for specific season |
| `GET /api/tmdb/thumbnails` | TMDB episode thumbnails by romaji + seasons |
| `GET /api/imdb/posters` | IMDB SX500 poster URLs by anime title |
| `GET /api/aniworld/search` | Search AniWorld for anime slug |
| `GET /api/aniworld/series/[slug]` | Series info + seasons + episodes |
| `GET /api/aniworld/episode/[...id]` | Episode stream links (20s timeout, 8s per hoster) |
| `GET /api/aniskip/[malId]/[episode]` | Skip intro/outro timing |

### Hoster System (`src/lib/hosters.ts`)
- **VOE**: 7-step decode (ROT13 → junk removal → base64 → char shift -3 → reverse → base64 → JSON). Extracts m3u8 from `cloudwindow-route.com` CDN. Needs `Referer: https://voe.sx/`
- **Vidmoly**: Fetch embed page, extract `sources: [{file: "..."}]`. Needs User-Agent, Referer, `Cookie: cf_turnstile_demo_pass_{ID}=1`
- **Vidara**: 3-domain parallel (`vidara.to`, `vidara.so`, `vidara.cc`) → POST `/api/stream` with `{filecode, device: "web"}`

### Cover Image Strategy
- **AniList**: `extraLarge` coverImage (~225x318px portrait) — shown immediately as fallback
- **IMDB**: SX500 posters (~500x700px) via suggestion API — loaded client-side via `PosterSection`
  - API: `https://v3.sg.media-imdb.com/suggestion/{letter}/{query}.json`
  - Filter: `qid === 'tvSeries'` || `qid === 'tvMiniSeries'`
  - Resize: Append `_V1_SX500.jpg` to image URL
  - No auth, no CORS, CDN-backed, 7-day cache
- **TMDB**: `w500` for episode thumbnails and `w780` for banner/film images

### German Anime Providers (Research Summary)
1. **AniWorld.to** — Primary streaming source, VOE/Vidmoly hosters, German Dub/Sub/Eng Sub
2. **VOE.sx** — Hoster with direct m3u8 streams, up to 720p
3. **Nyaa.si** — Torrent site, search "Deutsch dub", uploaders: [Fuchs], [Lycan], [BOLS] — BluRay Remux 1080p MKV
4. **Anime-Loads.org** — German anime DDL/streaming (may be down)
5. **Crunchyroll DE** — 300+ anime with German dub (legal, DRM)
6. **RTL+** — German anime via Sony/Crunchyroll deal (legal)
7. **aniSearch.de** — Tracks German streaming availability per provider
8. **SenpaiDub** — German dub/sub availability tracker

### Git
- Remote: `https://github.com/Guulinus/aniweb.git` (branch: main)
- **No credential helper configured** — push with PAT inline (ask user for current PAT, do NOT hardcode in repo):
  ```bash
  git push https://<PAT>@github.com/Guulinus/aniweb.git main
  ```
- **NEVER commit PAT or secrets to the repo — GitHub push protection blocks it**
- Commit only when user explicitly requests
- Backup (source only, no node_modules/.next/.git/data): `/home/sam/aniweb-back`
- Copy AGENTS.md to backup after updates: `cp AGENTS.md /home/sam/aniweb-back/AGENTS.md`

### Build & Deploy
```bash
npm run build                    # local build
# Deploy:
rsync -av --timeout=60 .next/ pi@192.168.178.84:aniweb/.next/
# CRITICAL: Remove old standalone static, then copy fresh + fix BUILD_ID:
sshpass -p 'Guulinus2' ssh pi@192.168.178.84 \
  'rm -rf /home/pi/aniweb/.next/standalone/.next/static && \
   cp -r /home/pi/aniweb/.next/static /home/pi/aniweb/.next/standalone/.next/static && \
   cp -r /home/pi/aniweb/public /home/pi/aniweb/.next/standalone/public 2>/dev/null && \
   cp /home/pi/aniweb/.next/BUILD_ID /home/pi/aniweb/.next/standalone/.next/BUILD_ID && \
   fuser -k 3000/tcp 2>/dev/null; sleep 2; \
   cd /home/pi/aniweb/.next/standalone && nohup node server.js > ~/aniweb.log 2>&1 &'
# Verify: sleep 3 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

### Important Notes
- **CRITICAL**: After rsync, must `rm -rf` standalone `.next/static` BEFORE `cp -r` — otherwise `cp -r` doesn't overwrite changed files (different hashes). Also `cp` the BUILD_ID file.
- `systemctl restart aniweb` fails with EADDRINUSE — must `fuser -k 3000/tcp` first
- Pi DNS: `/etc/resolv.conf` set to `8.8.8.8` + `8.8.4.4` + `192.168.178.6`
- AniList rate limiting: ~90 req/min
- `regex /s` flag not supported at current tsconfig target
- AniWorld series API: `{seasonNumber, episodes: [{number, title, slug}]}` (NOT `{season, episode}`)
- TMDB_API_KEY: `7a6f6473c46188721c31804f166eb53d`
- TMDB_IMG_BASE: `https://image.tmdb.org/t/p/w780`
- HLS.js config: `enableWorker: true`, `lowLatencyMode: false`
- Pi systemd: `LimitNOFILE=4096`, `NODE_OPTIONS=--max-old-space-size=384`
- Pi backup location: `/home/sam/aniweb-back` (source only, no node_modules/.next/.git/data)
