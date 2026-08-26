// File-based user storage: reads/writes data/auth.json and per-user avatar files.
import path from 'path';
import fs from 'fs';
import type { User } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');

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
