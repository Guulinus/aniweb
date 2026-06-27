'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function LoginPage() {
  const { login, register, user } = useAuth();
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.push('/');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const err = isRegister
      ? await register(username, password)
      : await login(username, password);

    setBusy(false);
    if (err) {
      setError(err);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">
          {isRegister ? 'Registrieren' : 'Anmelden'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-theme-primary text-white"
              required
              minLength={3}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-theme-primary text-white"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 bg-theme-primary hover:bg-theme-hover focus-visible:bg-theme-hover disabled:opacity-50 rounded-lg font-medium transition"
          >
            {busy ? 'Bitte warten...' : isRegister ? 'Registrieren' : 'Anmelden'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          {isRegister ? 'Bereits registriert?' : 'Noch kein Konto?'}{' '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-theme-primary hover:underline"
          >
            {isRegister ? 'Anmelden' : 'Registrieren'}
          </button>
        </p>
      </div>
    </div>
  );
}
