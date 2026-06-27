import { NextRequest, NextResponse } from 'next/server';
import { getUserById, readUserData } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const syncData = readUserData(userId);

    const watchlistStats = {
      total: syncData.watchlist.length,
      watching: syncData.watchlist.filter((w: any) => w.status === 'WATCHING').length,
      completed: syncData.watchlist.filter((w: any) => w.status === 'COMPLETED').length,
      planning: syncData.watchlist.filter((w: any) => w.status === 'PLANNING').length,
      dropped: syncData.watchlist.filter((w: any) => w.status === 'DROPPED').length,
    };

    const ratingsCount = syncData.ratings ? Object.keys(syncData.ratings).length : 0;
    const avgRating = syncData.ratings && ratingsCount > 0
      ? Math.round((Object.values(syncData.ratings as Record<string, number>).reduce((a, b) => a + b, 0) / ratingsCount) * 10) / 10
      : null;

    // Keep only needed fields from positions
    const recentActivity = (syncData.positions || [])
      .sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 10)
      .map((p: any) => ({
        key: p.key,
        animeId: p.animeId,
        slug: p.slug,
        season: p.season,
        episode: p.episode,
        time: p.time,
        duration: p.duration,
        updatedAt: p.updatedAt,
      }));

    return NextResponse.json({
      profile: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      stats: {
        watchlist: watchlistStats,
        ratingsGiven: ratingsCount,
        averageRating: avgRating,
        totalEpisodesWatched: syncData.positions?.length || 0,
      },
      recentActivity,
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('Profile API error:', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
