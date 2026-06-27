import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, createToken, getUserByUsername, createUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password || username.length < 3 || password.length < 6) {
      return NextResponse.json({ error: 'Username (min 3) and password (min 6) required' }, { status: 400 });
    }

    if (getUserByUsername(username)) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = createUser(username, passwordHash);
    const token = await createToken({ userId: user.id, username });

    const res = NextResponse.json({ success: true, username, user }, { status: 201 });
    res.cookies.set('aniroll_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
