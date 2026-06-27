import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import path from 'path';
import fs from 'fs';
import type { User } from '@/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'aniroll-dev-secret-change-in-production');
const COOKIE_NAME = 'aniroll_session';
const DATA_DIR = path.join(process.cwd(), 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');

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

interface AuthData {
  users: {
    id: number;
    username: string;
    displayName: string | null;
    email: string | null;
    avatarUrl: string | null;
    passwordHash: string;
    createdAt: number;
  }[];
  nextId: number;
}

interface SyncData {
  watchlist: any[];
  positions: any[];
  history: any[];
  ratings?: Record<string, number>;
  settings?: Record<string, unknown>;
}

const authCache: { data: AuthData | null } = { data: null };

function readAuth(): AuthData {
  if (authCache.data) return authCache.data;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(AUTH_FILE)) {
      const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
      authCache.data = JSON.parse(raw);
      return authCache.data!;
    }
  } catch (err) {
    console.error('Error reading auth file:', err);
  }
  authCache.data = { users: [], nextId: 1 };
  return authCache.data!;
}

function writeAuth(data: AuthData) {
  authCache.data = data;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing auth file:', err);
  }
}

export function readUserData(userId: number): SyncData {
  const file = path.join(DATA_DIR, `user_${userId}.json`);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch {}
  return { watchlist: [], positions: [], history: [] };
}

function writeUserData(userId: number, data: SyncData) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, `user_${userId}.json`), JSON.stringify(data));
  } catch (err) {
    console.error('Error writing user data:', err);
  }
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

export function getAvatarPath(userId: number): string {
  const dir = path.join(DATA_DIR, 'avatars');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const files = fs.readdirSync(dir).filter(f => f.startsWith(`${userId}.`));
  return files.length > 0 ? path.join(dir, files[0]) : '';
}

export function getAvatarUrl(userId: number): string {
  return `/api/user/avatar/${userId}`;
}

export function saveAvatarFile(userId: number, buffer: Buffer, ext: string): string {
  const dir = path.join(DATA_DIR, 'avatars');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Remove old avatar
  const old = fs.readdirSync(dir).filter(f => f.startsWith(`${userId}.`));
  old.forEach(f => fs.unlinkSync(path.join(dir, f)));
  const filePath = path.join(dir, `${userId}.${ext}`);
  fs.writeFileSync(filePath, buffer);
  return getAvatarUrl(userId);
}

export function getUserByUsername(username: string) {
  const data = readAuth();
  return data.users.find(u => u.username === username) || null;
}

export function getUserPasswordHash(id: number): string | null {
  const data = readAuth();
  const u = data.users.find(u => u.id === id);
  return u ? u.passwordHash : null;
}

export function getUserById(id: number) {
  const data = readAuth();
  const u = data.users.find(u => u.id === id);
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
  } satisfies User;
}

export function createUser(username: string, passwordHash: string): User {
  const data = readAuth();
  const id = data.nextId++;
  const now = Date.now();
  data.users.push({
    id, username, displayName: username, email: null, avatarUrl: null,
    passwordHash, createdAt: now,
  });
  writeAuth(data);
  return { id, username, displayName: username, email: null, avatarUrl: null, createdAt: now };
}

export function updateUser(id: number, updates: { displayName?: string; email?: string; avatarUrl?: string; passwordHash?: string }) {
  const data = readAuth();
  const user = data.users.find(u => u.id === id);
  if (!user) return;
  if (updates.displayName !== undefined) user.displayName = updates.displayName;
  if (updates.email !== undefined) user.email = updates.email;
  if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;
  if (updates.passwordHash !== undefined) user.passwordHash = updates.passwordHash;
  writeAuth(data);
}

export function getSyncData(userId: number): SyncData {
  return readUserData(userId);
}

export function putSyncData(userId: number, data: SyncData) {
  writeUserData(userId, data);
}

export function mergeSyncData(userId: number, client: SyncData): SyncData {
  const server = readUserData(userId);

  const watchlistMap = new Map<number, any>();
  for (const e of server.watchlist) watchlistMap.set(e.animeId, e);
  for (const e of client.watchlist) {
    const existing = watchlistMap.get(e.animeId);
    if (!existing || (e.lastWatched || e.addedAt) > (existing.lastWatched || existing.addedAt)) {
      watchlistMap.set(e.animeId, e);
    }
  }
  const mergedWatchlist = Array.from(watchlistMap.values());

  const posMap = new Map<string, any>();
  for (const p of server.positions) posMap.set(p.key, p);
  for (const p of client.positions) {
    const existing = posMap.get(p.key);
    if (!existing || (p.updatedAt || 0) > (existing.updatedAt || 0)) {
      posMap.set(p.key, p);
    }
  }
  const mergedPositions = Array.from(posMap.values());

  const historySet = new Set(server.history.map((h: any) => JSON.stringify(h)));
  for (const h of client.history) {
    historySet.add(JSON.stringify(h));
  }
  const mergedHistory = Array.from(historySet).map((s: string) => JSON.parse(s));

  const mergedRatings = { ...(server.ratings || {}), ...(client.ratings || {}) };

  // Settings: client wins entirely (latest device config)
  const mergedSettings = client.settings || server.settings || {};

  const merged: SyncData = {
    watchlist: mergedWatchlist,
    positions: mergedPositions,
    history: mergedHistory,
    ratings: mergedRatings,
    settings: mergedSettings,
  };

  writeUserData(userId, merged);
  return merged;
}
