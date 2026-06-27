import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId;
    const avatarDir = path.join(DATA_DIR, 'avatars');
    const files = fs.readdirSync(avatarDir).filter(f => f.startsWith(`${userId}.`));
    if (files.length === 0) return new NextResponse(null, { status: 404 });

    const filePath = path.join(avatarDir, files[0]);
    const buffer = fs.readFileSync(filePath);
    const ext = files[0].split('.').pop() || 'png';
    const mime: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
