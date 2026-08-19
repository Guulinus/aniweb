'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export const THEME_PRESETS: Record<string, { primary: string; hover: string }> = {
  aniroll: { primary: '#a855f7', hover: '#9333ea' },
  crunchyroll: { primary: '#f97316', hover: '#ea580c' },
  netflix: { primary: '#e50914', hover: '#b20710' },
  emerald: { primary: '#10b981', hover: '#059669' },
  sky: { primary: '#0ea5e9', hover: '#0284c7' },
  rose: { primary: '#f43f5e', hover: '#e11d48' },
};

interface ThemeSettings {
  theme: 'aniroll' | 'crunchyroll' | 'netflix' | 'emerald' | 'sky' | 'rose' | 'custom';
  customColor: string;
}

interface Settings {
  preferredLanguage: 'jp' | 'de';
  theme: ThemeSettings;
}

interface SettingsContextType {
  settings: Settings;
  setPreferredLanguage: (lang: 'jp' | 'de') => void;
  setThemePreset: (preset: ThemeSettings['theme']) => void;
  setCustomColor: (hex: string) => void;
}

const defaultSettings: Settings = {
  preferredLanguage: 'de',
  theme: { theme: 'aniroll', customColor: '#a855f7' },
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  setPreferredLanguage: () => {},
  setThemePreset: () => {},
  setCustomColor: () => {},
});

function applyTheme(theme: ThemeSettings) {
  const html = document.documentElement;
  const preset = THEME_PRESETS[theme.theme as keyof typeof THEME_PRESETS];
  if (theme.theme === 'custom') {
    html.setAttribute('data-theme', 'custom');
    const color = theme.customColor || '#a855f7';
    html.style.setProperty('--custom-primary', color);
    html.style.setProperty('--custom-primary-hover', adjustBrightness(color, -20));
    html.style.setProperty('--custom-primary-soft', hexToRgba(color, 0.2));
    html.style.setProperty('--custom-primary-border', hexToRgba(color, 0.3));
    html.style.setProperty('--custom-primary-shadow', hexToRgba(color, 0.25));
  } else if (preset) {
    html.setAttribute('data-theme', theme.theme);
    html.style.removeProperty('--custom-primary');
    html.style.removeProperty('--custom-primary-hover');
    html.style.removeProperty('--custom-primary-soft');
    html.style.removeProperty('--custom-primary-border');
    html.style.removeProperty('--custom-primary-shadow');
  } else {
    html.removeAttribute('data-theme');
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(168, 85, 247, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustBrightness(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  let r = parseInt(clean.substring(0, 2), 16);
  let g = parseInt(clean.substring(2, 4), 16);
  let b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#9333ea';
  r = Math.max(0, Math.min(255, r + percent));
  g = Math.max(0, Math.min(255, g + percent));
  b = Math.max(0, Math.min(255, b + percent));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('anirollSettings');
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultSettings;
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem('anirollSettings', JSON.stringify(settings));
  } catch {}
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    applyTheme(loaded.theme);
    setReady(true);
  }, []);

  const setPreferredLanguage = useCallback((lang: 'jp' | 'de') => {
    setSettings(prev => {
      const next = { ...prev, preferredLanguage: lang };
      saveSettings(next);
      return next;
    });
    import('@/lib/syncClient').then(m => m.pushServerData()).catch(() => {});
  }, []);

  const setThemePreset = useCallback((preset: ThemeSettings['theme']) => {
    setSettings(prev => {
      const theme = { ...prev.theme, theme: preset };
      const next = { ...prev, theme };
      saveSettings(next);
      applyTheme(theme);
      return next;
    });
    import('@/lib/syncClient').then(m => m.pushServerData()).catch(() => {});
  }, []);

  const setCustomColor = useCallback((hex: string) => {
    setSettings(prev => {
      const theme = { theme: 'custom' as const, customColor: hex };
      const next = { ...prev, theme };
      saveSettings(next);
      applyTheme(theme);
      return next;
    });
    import('@/lib/syncClient').then(m => m.pushServerData()).catch(() => {});
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setPreferredLanguage, setThemePreset, setCustomColor }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
