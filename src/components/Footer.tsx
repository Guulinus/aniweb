'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

export default function Footer() {
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();

  const links = language === 'de' ? {
    browse: 'Durchsuchen',
    calendar: 'Kalender',
    watchlist: 'Merkliste',
    history: 'Verlauf',
    about: 'Über uns',
    contact: 'Kontakt',
    privacy: 'Datenschutz',
    terms: 'Nutzungsbedingungen',
    disclaimer: 'Haftungsausschluss',
    copyright: 'Urheberrecht',
  } : {
    browse: 'Browse',
    calendar: 'Calendar',
    watchlist: 'Watchlist',
    history: 'History',
    about: 'About',
    contact: 'Contact',
    privacy: 'Privacy',
    terms: 'Terms',
    disclaimer: 'Disclaimer',
    copyright: 'Copyright',
  };

  return (
    <footer className="bg-[#060609] border-t border-white/[0.04] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{language === 'de' ? 'Navigation' : 'Navigation'}</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition">{language === 'de' ? 'Startseite' : 'Home'}</Link></li>
              <li><Link href="/browse" className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition">{links.browse}</Link></li>
              <li><Link href="/calendar" className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition">{links.calendar}</Link></li>
              <li><Link href="/watchlist" className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition">{links.watchlist}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{language === 'de' ? 'Rechtliches' : 'Legal'}</h3>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition">{links.privacy}</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition">{links.terms}</Link></li>
              <li><Link href="/contact" className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition">{links.contact}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{language === 'de' ? 'Support' : 'Support'}</h3>
            <ul className="space-y-2">
              <li><Link href="/faq" className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition">{language === 'de' ? 'FAQ' : 'FAQ'}</Link></li>
              <li><Link href="/help" className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition">{language === 'de' ? 'Hilfe' : 'Help'}</Link></li>
              <li><Link href="/report" className="text-sm text-gray-400 hover:text-theme-primary focus-visible:text-theme-primary transition">{language === 'de' ? 'Problem melden' : 'Report Issue'}</Link></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-white/[0.04] pt-6 mb-6">
          <p className="text-xs text-gray-500 text-center">
            {language === 'de' 
              ? 'AniRoll ist ein Streaming-Dienst, der Anime-Fans zusammenbringt. Wir hosten keine Videos selbst. Alle Inhalte werden von Drittanbietern bereitgestellt.'
              : 'AniRoll is a streaming service that brings anime fans together. We do not host any videos ourselves. All content is provided by third-party providers.'}
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-theme-primary font-bold">AniRoll</span>
            <span>© {currentYear} {links.copyright}</span>
          </div>
          <div className="flex gap-4">
            <span>{language === 'de' ? 'Made with' : 'Made with'} <span className="text-red-500">❤</span> {language === 'de' ? 'für Anime-Fans' : 'for Anime Fans'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}