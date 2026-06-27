<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project: AniWeb – Self-hosted anime streaming (Next.js 14 standalone)

### Goal
User account system (login, profile, avatar upload, synced watch history) and UI tweaks: remaining-time display, auto-complete at 2min, next-episode suggestion.

### Constraints
- Pi password: `Guulinus2` · Pi (192.168.178.84) is linux-arm64; local machine is linux-x64
- User tests locally first, only deploys to Pi after local success
- Next.js 14 with `output: 'standalone'`

### Auth System
- `src/lib/auth.ts`: JWT sign/verify (`jose`), password hash/verify (`bcryptjs`), file-based JSON storage
- **Cookie issue in production**: `req.cookies.get()` returns empty in Next.js 14 standalone; use `cookies()` from `next/headers` instead
- **Session initial load**: AuthContext calls `/api/auth/me` on mount; login/register set user state directly from response body (no second call)
- Cookie: `aniroll_session`, httpOnly, path `/`, sameSite `lax`, 30d

### API Routes
| Route | Purpose |
|---|---|
| `POST /api/auth/register` | Creates user, sets cookie, returns user |
| `POST /api/auth/login` | Verifies password, sets cookie, returns user (with all fields) |
| `POST /api/auth/logout` | Clears cookie |
| `GET /api/auth/me` | Reads cookie, returns user |
| `PUT /api/user/profile` | Updates displayName, email, password |
| `GET/POST /api/user/sync` | Push/pull watchlist, positions, history |
| `POST /api/user/avatar` | Upload avatar (multipart, JPG/PNG/GIF/WebP, max 2MB), stores in `data/avatars/{userId}.{ext}` |
| `GET /api/user/avatar/[userId]` | Serves avatar file with correct Content-Type and Cache-Control |

### Files Changed (new/modified)  
- `src/lib/auth.ts` – added `getAvatarPath()`, `getAvatarUrl()`, `saveAvatarFile()`, `mergeSyncData()`  
- `src/app/api/user/avatar/route.ts` – POST upload handler  
- `src/app/api/user/avatar/[userId]/route.ts` – GET serving handler  
- `src/app/settings/page.tsx` – file upload UI for avatar (removed URL input, uses canvas preview)  
- `src/app/api/auth/login/route.ts` – fixed hardcoded `avatarUrl: null`, now uses `user.avatarUrl ?? null`  
- `src/app/api/user/sync/route.ts` – POST now **merges** client+server data via `mergeSyncData()` and returns merged result  
- `src/lib/syncClient.ts` – **NEW**: collects localStorage positions + watchlist, pushes to server, applies merged data back to localStorage  
- `src/lib/AuthContext.tsx` – calls `syncAfterLogin()` on login/register, calls `pullServerData()` on initial load if authenticated  
- `src/components/VideoPlayer.tsx` – position saves use `updatedAt` field (was `updated`)  
- `src/app/watch/[...]/page.tsx` – uses `updatedAt` in position read; adds `updatedAt` to watchlist entries  
- `src/types/index.ts` – `WatchlistEntry` gains optional `updatedAt`  

### Sync Architecture
- **Client → Server**: On login/register, `syncAfterLogin()` collects all `watchPosition:*` entries and the `watchlist` from localStorage, POSTs to `/api/user/sync`
- **Server merge**: `mergeSyncData(userId, clientData)` reads server data, merges per-item:
  - **watchlist**: by `animeId`, newer `lastWatched/addedAt` wins  
  - **positions**: by `key`, newer `updatedAt` wins  
  - **history**: union (unique entries)  
  - Writes merged result to `data/user_{id}.json` and returns it
- **Server → Client**: `pullServerData()` GETs from `/api/user/sync` and writes merged watchlist + positions back to localStorage
- **On page load**: if already authenticated (from cookie), `AuthContext` calls `pullServerData()` after initial `refresh()`

### Build & Deploy
```bash
npm run build              # local
rsync -avz --delete .next/ pi@192.168.178.84:aniweb/.next/
# On Pi: cd aniweb && PORT=3001 node .next/standalone/server.js
```

### Notes
- SQLite (`data/anime.db`) used only in standalone `scripts/start-server.ts`, NOT in Next.js API routes (native module limitation)
- Auth data in `data/auth.json` (users + password hashes) + `data/user_{id}.json` (sync data)
- JWT secret: `process.env.JWT_SECRET || 'aniroll-dev-secret-change-in-production'`
- `next.config.ts`: `output: 'standalone'`, `serverExternalPackages: ['jsdom']`
- Avatar files stored in `data/avatars/{userId}.{ext}`, served via `/api/user/avatar/{userId}` with 24h Cache-Control
