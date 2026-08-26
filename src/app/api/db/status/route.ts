import { getDb, getLastSyncTime } from '@/lib/animeCache';
import type { AnimeBasic } from '@/types';

export async function GET() {
  const lastSync = getLastSyncTime();
  const now = Math.floor(Date.now() / 1000);
  const twelveHours = 12 * 60 * 60;
  
  if (!lastSync || now - lastSync > twelveHours) {
    return Response.json({ 
      needsSync: true, 
      lastSync,
      reason: !lastSync ? 'never synced' : `last sync was ${Math.floor((now - lastSync) / 3600)} hours ago`
    });
  }
  
  return Response.json({ needsSync: false, lastSync });
}