import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createToken, getUserByUsername } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const user = getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = await createToken({ userId: user.id, username: user.username });

    console.log('[Login] Token created, setting cookie');

    const res = NextResponse.json({
      success: true, username: user.username,
      user: { id: user.id, username: user.username, displayName: user.displayName, email: user.email ?? null, avatarUrl: user.avatarUrl ?? null, createdAt: user.createdAt },
    });

    res.cookies.set('aniroll_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
