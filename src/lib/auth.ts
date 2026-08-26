// JWT signing/verification, password hashing, and session cookie handling.
// File-based user storage lives in `userStore.ts`, watchlist/history sync in
// `syncStore.ts` — both are re-exported below so existing imports of
// `@/lib/auth` keep working unchanged.
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

function loadJwtSecret(): Uint8Array {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    return new TextEncoder().encode(fromEnv);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is missing or too short. Set a random secret of at least 32 characters ' +
      '(e.g. `openssl rand -base64 48`) as an environment variable before starting in production.'
    );
  }

  // Dev-only fallback so `next dev` keeps working without extra setup.
  console.warn('[auth] JWT_SECRET not set — using an insecure dev-only fallback. Do NOT use this in production.');
  return new TextEncoder().encode('aniroll-dev-secret-do-not-use-in-production');
}

const JWT_SECRET = loadJwtSecret();
const COOKIE_NAME = 'aniroll_session';

export function getAuthToken(req?: NextRequest): string | null {
  if (req) {
    const raw = req.headers.get('cookie') || '';
    const match = raw.split(';').map(c => c.trim()).find(c => c.startsWith('aniroll_session='));
    if (match) return match.split('=').slice(1).join('=');
  }

  try {
    const t = cookies().get('aniroll_session')?.value;
    if (t) return t;
  } catch {}

  if (req) {
    try {
      const t = req.cookies.get('aniroll_session')?.value;
      if (t) return t;
    } catch {}
  }

  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: { userId: number; username: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ userId: number; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: number; username: string };
  } catch {
    return null;
  }
}

export function getCookieName(): string {
  return COOKIE_NAME;
}

export {
  getAvatarPath,
  getAvatarUrl,
  saveAvatarFile,
  getUserByUsername,
  getUserPasswordHash,
  getUserById,
  createUser,
  updateUser,
} from './userStore';

export {
  readUserData,
  getSyncData,
  putSyncData,
  mergeSyncData,
} from './syncStore';
