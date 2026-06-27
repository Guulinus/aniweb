import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, verifyToken, getUserById, updateUser, saveAvatarFile } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest) {
  try {
    const token = getAuthToken(req);
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, GIF, WebP allowed' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    const ext = file.type.split('/')[1];
    const buffer = Buffer.from(await file.arrayBuffer());
    const avatarUrl = saveAvatarFile(payload.userId, buffer, ext);
    updateUser(payload.userId, { avatarUrl });

    const user = getUserById(payload.userId);
    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
