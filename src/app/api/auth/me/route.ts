import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, verifyToken, getUserById } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '(none)';
    const token = getAuthToken(request);

    console.log(`[ME] Cookie header: ${cookieHeader.substring(0, 150)}`);
    console.log(`[ME] Token found: ${!!token}`);

    if (!token) return NextResponse.json({ user: null });

    const payload = await verifyToken(token);
    console.log(`[ME] Token valid: ${!!payload}`);

    if (!payload) return NextResponse.json({ user: null });

    const user = getUserById(payload.userId);
    console.log(`[ME] User found: ${!!user}`);

    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({ user }, {
      headers: { 'Cache-Control': 'no-store, must-revalidate' },
    });
  } catch (err) {
    console.error('[ME] Error:', err);
    return NextResponse.json({ user: null });
  }
}
