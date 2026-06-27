import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, verifyToken, updateUser, hashPassword, verifyPassword, getUserPasswordHash } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    const token = getAuthToken(req);
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const updates: any = {};

    if (body.displayName !== undefined) updates.displayName = body.displayName;
    if (body.email !== undefined) updates.email = body.email;
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;

    if (body.newPassword && body.currentPassword) {
      const currentHash = getUserPasswordHash(payload.userId);
      if (!currentHash || !(await verifyPassword(body.currentPassword, currentHash))) {
        return NextResponse.json({ error: 'Current password is wrong' }, { status: 403 });
      }
      updates.passwordHash = await hashPassword(body.newPassword);
    }

    updateUser(payload.userId, updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
