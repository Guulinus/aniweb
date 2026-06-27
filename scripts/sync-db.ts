import { syncDatabase } from '../src/lib/sync';

async function main() {
  console.log('Starting sync...');
  const start = Date.now();
  await syncDatabase();
  console.log(`Done in ${(Date.now() - start) / 1000}s`);
}

main().catch(e => { console.error(e); process.exit(1); });
