'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from './SearchBar';
import { useLanguage } from '@/hooks/useLanguage';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function Navbar() {
  const { language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navLinks = language === 'de'
    ? { browse: 'Durchsuchen', seasonal: 'Saisonal', watchlist: 'Merkliste', history: 'Verlauf' }
    : { browse: 'Browse', seasonal: 'Seasonal', watchlist: 'Watchlist', history: 'History' };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f] border-b border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AR</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:to-violet-300 transition">
                AniRoll
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1 h-full">
              <NavLink href="/" active={isActive('/')}>{language === 'de' ? 'Start' : 'Home'}</NavLink>
              <NavLink href="/browse" active={isActive('/browse')}>{navLinks.browse}</NavLink>
              <NavLink href="/seasonal" active={isActive('/seasonal')}>{navLinks.seasonal}</NavLink>
              <NavLink href="/watchlist" active={isActive('/watchlist')}>{navLinks.watchlist}</NavLink>
              <NavLink href="/history" active={isActive('/history')}>{navLinks.history}</NavLink>
            </div>
          </div>

          {/* Desktop Search */}
          <div className="flex-1 max-w-md mx-4 hidden sm:block">
            <SearchBar />
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Mobile Search Icon */}
            <Link
              href="/search"
              className="sm:hidden p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>

            {/* Language Toggle */}
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setLanguage('de')}
                className={`px-2 py-1 text-xs font-medium rounded transition flex items-center ${language === 'de' ? 'bg-theme-primary text-white' : 'text-gray-400 hover:text-white focus-visible:text-white'}`}
              >
                DE
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs font-medium rounded transition flex items-center ${language === 'en' ? 'bg-theme-primary text-white' : 'text-gray-400 hover:text-white focus-visible:text-white'}`}
              >
                EN
              </button>
            </div>

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              {user ? (
                <>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 focus-visible:bg-gray-700 rounded-lg transition"
                  >
                    <AvatarCircle name={user.displayName || user.username} url={user.avatarUrl} />
                    <span className="text-sm max-w-[100px] truncate hidden sm:block">{user.displayName || user.username}</span>
                    <svg className="w-3.5 h-3.5 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1">
                      <Link href={`/profile/${user.id}`} onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700">
                        {language === 'de' ? 'Profil' : 'Profile'}
                      </Link>
                      <Link href="/settings" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700">
                        {language === 'de' ? 'Einstellungen' : 'Settings'}
                      </Link>
                      <button onClick={() => { logout(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 focus-visible:bg-gray-700">
                        {language === 'de' ? 'Abmelden' : 'Logout'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link href="/login" className="px-3 py-1.5 text-sm bg-theme-primary hover:bg-theme-hover focus-visible:bg-theme-hover rounded-lg font-medium transition">
                  {language === 'de' ? 'Anmelden' : 'Login'}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function AvatarCircle({ name, url }: { name: string; url: string | null }) {
  const [imgError, setImgError] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  if (url && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="w-6 h-6 rounded-full object-cover bg-gray-600 ring-2 ring-white/10"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="w-6 h-6 rounded-full bg-theme-primary flex items-center justify-center text-xs font-bold ring-2 ring-white/10">
      {initial}
    </div>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3.5 py-2.5 text-[15px] font-medium rounded-lg transition-colors h-full flex items-center ${
        active
          ? 'bg-theme-soft text-theme-primary'
          : 'text-gray-300 hover:text-white hover:bg-gray-800 focus-visible:text-white focus-visible:bg-gray-800'
      }`}
    >
      {children}
    </Link>
  );
}
