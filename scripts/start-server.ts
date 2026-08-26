import { spawn } from 'child_process';
import path from 'path';
import { syncDatabase, loadCacheFromDb } from '../src/lib/sync';

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

async function main() {
  console.log('[Startup] Loading cache from database...');
  const cached = loadCacheFromDb();
  console.log(`[Startup] Loaded ${cached} anime from cache`);

  const lastSyncTime = (await import('../src/lib/animeCache')).getLastSyncTime();

  if (!lastSyncTime || Date.now() / 1000 - lastSyncTime > 12 * 3600) {
    console.log('[Startup] Data is stale, running initial sync...');
    syncDatabase().catch(err => {
      console.error('[Startup] Initial sync failed:', err);
    });
  }

  setInterval(() => {
    console.log('[Sync] Running scheduled 12-hour sync...');
    syncDatabase().catch(err => {
      console.error('[Sync] Scheduled sync failed:', err);
    });
  }, TWELVE_HOURS);

  const root = path.resolve(__dirname, '..');
  const server = spawn('node', [
    path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'),
    'start',
  ], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
      PORT: process.env.PORT || '3000',
      HOST: process.env.HOST || '0.0.0.0',
    },
  });

  server.on('exit', (code) => {
    console.log(`[Server] Next.js exited with code ${code}`);
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => { server.kill('SIGINT'); process.exit(0); });
  process.on('SIGTERM', () => { server.kill('SIGTERM'); process.exit(0); });
}

main().catch(err => {
  console.error('[Startup] Fatal error:', err);
  process.exit(1);
});
