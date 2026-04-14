'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from './SearchBar';
import { useLanguage } from '@/hooks/useLanguage';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = language === 'de' 
    ? { browse: 'Durchsuchen', watchlist: 'Merkliste', history: 'Verlauf' }
    : { browse: 'Browse', watchlist: 'Watchlist', history: 'History' };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-gray-900/95 backdrop-blur-sm shadow-lg' : 'bg-gray-900'}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
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
            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/" active={isActive('/')}>{language === 'de' ? 'Start' : 'Home'}</NavLink>
              <NavLink href="/browse" active={isActive('/browse')}>{navLinks.browse}</NavLink>
              <NavLink href="/watchlist" active={isActive('/watchlist')}>{navLinks.watchlist}</NavLink>
              <NavLink href="/history" active={isActive('/history')}>{navLinks.history}</NavLink>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-4 hidden sm:block">
            <SearchBar />
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Mobile Search Button */}
            <button className="sm:hidden p-2 text-gray-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            {/* Language Toggle */}
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setLanguage('de')}
                className={`px-2 py-1 text-xs font-medium rounded transition ${language === 'de' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                DE
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs font-medium rounded transition ${language === 'en' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        active 
          ? 'bg-purple-500/20 text-purple-400' 
          : 'text-gray-300 hover:text-white hover:bg-gray-800'
      }`}
    >
      {children}
    </Link>
  );
}