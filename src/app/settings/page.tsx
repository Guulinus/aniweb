'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useSettings, THEME_PRESETS } from '@/lib/SettingsContext';

type Tab = 'profile' | 'preferences';

const PRESET_NAMES: Record<string, string> = {
  aniroll: 'AniRoll',
  crunchyroll: 'Crunchyroll',
  netflix: 'Netflix',
  emerald: 'Smaragd',
  sky: 'Himmel',
  rose: 'Rose',
};

export default function SettingsPage() {
  const { user, loading, logout, refresh } = useAuth();
  const { settings, setPreferredLanguage, setThemePreset, setCustomColor } = useSettings();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Lädt...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">
        {tab === 'profile' ? 'Einstellungen' : 'Einstellungen'}
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-900 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('profile')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === 'profile' ? 'bg-theme-primary text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Profil
        </button>
        <button
          onClick={() => setTab('preferences')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === 'preferences' ? 'bg-theme-primary text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Einstellungen
        </button>
      </div>

      {tab === 'profile' && <ProfileTab user={user} refresh={refresh} logout={logout} />}
      {tab === 'preferences' && (
        <PreferencesTab
          preferredLanguage={settings.preferredLanguage}
          theme={settings.theme}
          setPreferredLanguage={setPreferredLanguage}
          setThemePreset={setThemePreset}
          setCustomColor={setCustomColor}
        />
      )}
    </div>
  );
}

function ProfileTab({ user, refresh, logout }: { user: any; refresh: () => Promise<void>; logout: () => Promise<void> }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');

  useEffect(() => {
    setDisplayName(user.displayName || '');
    setEmail(user.email || '');
    setAvatarUrl(user.avatarUrl || '');
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setMessage('');

    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch('/api/user/avatar', { method: 'POST', body: formData });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      setAvatarUrl(data.user?.avatarUrl || '');
      setMessage('Profilbild hochgeladen!');
      refresh();
    } else {
      setError(data.error || 'Upload fehlgeschlagen');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setBusy(true);

    const body: Record<string, unknown> = { displayName, email, avatarUrl: user.avatarUrl };
    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setBusy(false);
    if (res.ok) {
      setMessage('Gespeichert!');
      setCurrentPassword('');
      setNewPassword('');
      refresh();
    } else {
      const data = await res.json();
      setError(data.error || 'Fehler beim Speichern');
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col items-center mb-6">
        <AvatarPreview url={avatarUrl} name={displayName || user.username} />
        <label className="mt-3 cursor-pointer px-4 py-2 bg-gray-800 hover:bg-gray-700 focus-visible:bg-gray-700 rounded-lg text-sm text-gray-300 transition">
          {uploading ? 'Lädt hoch...' : 'Profilbild hochladen'}
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
        </label>
        <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP · max 2MB</p>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Anzeigename</label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none text-white"
          style={{ borderColor: 'var(--color-primary)' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">E-Mail</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          style={{ borderColor: 'var(--color-primary)' }}
        />
      </div>

      <hr className="border-gray-700" />
      <h2 className="text-lg font-semibold text-white">Passwort ändern</h2>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Aktuelles Passwort</label>
        <input
          type="password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Neues Passwort</label>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          minLength={6}
        />
      </div>

      {message && <p className="text-green-400 text-sm">{message}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button type="submit" disabled={busy} className="w-full py-2.5 rounded-lg font-medium transition text-white disabled:opacity-50 bg-theme-primary hover:bg-theme-hover">
        {busy ? 'Speichern...' : 'Speichern'}
      </button>

      <div className="pt-6 border-t border-gray-700">
        <button onClick={logout} className="text-red-400 hover:text-red-300 focus-visible:text-red-300 text-sm">
          Abmelden
        </button>
      </div>
    </form>
  );
}

function PreferencesTab({
  preferredLanguage,
  theme,
  setPreferredLanguage,
  setThemePreset,
  setCustomColor,
}: {
  preferredLanguage: string;
  theme: { theme: string; customColor: string };
  setPreferredLanguage: (lang: 'jp' | 'de') => void;
  setThemePreset: (preset: any) => void;
  setCustomColor: (hex: string) => void;
}) {
  const [customHex, setCustomHex] = useState(theme.customColor || '#a855f7');

  return (
    <div className="space-y-8">
      {/* Language Preference */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Spracheinstellungen</h2>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <p className="text-sm text-gray-400 mb-3">Bevorzugte Audiosprache</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPreferredLanguage('de')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition ${
                preferredLanguage === 'de'
                  ? 'bg-theme-primary text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Deutsch (Sync)
            </button>
            <button
              onClick={() => setPreferredLanguage('jp')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition ${
                preferredLanguage === 'jp'
                  ? 'bg-theme-primary text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Japanisch (Sub)
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {preferredLanguage === 'de'
              ? 'Deutsche Synchronisation wird bevorzugt, falls verfügbar.'
              : 'Japanische Originalversion mit Untertiteln wird bevorzugt.'}
          </p>
        </div>
      </div>

      {/* Theme Colors */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Design</h2>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4">
          <p className="text-sm text-gray-400">Farbthema</p>

          {/* Presets */}
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(THEME_PRESETS).map(([key, colors]) => (
              <button
                key={key}
                onClick={() => setThemePreset(key as any)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition border ${
                  theme.theme === key
                    ? 'border-gray-400 text-white'
                    : 'border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors.primary }}
                />
                {PRESET_NAMES[key] || key}
              </button>
            ))}
          </div>

          {/* Custom Color */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => {
                  setThemePreset('custom');
                  setCustomColor(customHex);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition border ${
                  theme.theme === 'custom'
                    ? 'border-gray-400 text-white'
                    : 'border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: customHex }} />
                  Benutzerdefiniert
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={customHex}
                onChange={e => setCustomHex(e.target.value)}
                placeholder="#ff6600"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                maxLength={7}
              />
              <input
                type="color"
                value={customHex}
                onChange={e => {
                  setCustomHex(e.target.value);
                  setThemePreset('custom');
                  setCustomColor(e.target.value);
                }}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
              />
              <button
                onClick={() => {
                  setThemePreset('custom');
                  setCustomColor(customHex);
                }}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-hover"
              >
                Anwenden
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AvatarPreview({ url, name }: { url: string | null; name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const [imgError, setImgError] = useState(false);

  if (url && !imgError) {
    return (
      <div className="flex justify-center mb-4">
        <img src={url} alt="" className="w-20 h-20 rounded-full object-cover bg-gray-700" onError={() => setImgError(true)} />
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-4">
      <div className="w-20 h-20 rounded-full bg-theme-primary flex items-center justify-center text-2xl font-bold text-white">
        {initial}
      </div>
    </div>
  );
}
