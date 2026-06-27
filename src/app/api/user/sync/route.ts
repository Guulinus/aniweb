import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, verifyToken, mergeSyncData, getSyncData } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = getAuthToken(req);
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const merged = mergeSyncData(payload.userId, {
      watchlist: body.watchlist || [],
      positions: body.positions || [],
      history: body.history || [],
    });

    return NextResponse.json({ success: true, data: merged });
  } catch (err) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    return NextResponse.json(getSyncData(payload.userId));
  } catch (err) {
    console.error('Sync GET error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
