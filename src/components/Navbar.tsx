import Link from 'next/link';
import SearchBar from './SearchBar';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-purple-400 hover:text-purple-300 transition">
              AniWeb
            </Link>
            <div className="hidden md:flex gap-4">
              <Link href="/browse" className="text-gray-300 hover:text-white transition">
                Browse
              </Link>
              <Link href="/watchlist" className="text-gray-300 hover:text-white transition">
                Watchlist
              </Link>
            </div>
          </div>
          <div className="flex-1 max-w-md mx-4">
            <SearchBar />
          </div>
        </div>
      </div>
    </nav>
  );
}
