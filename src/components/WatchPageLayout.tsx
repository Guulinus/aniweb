'use client';
import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function WatchPageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWatchPage = /\/watch\/|\/filme\/.*\/watch/.test(pathname);

  return (
    <>
      <main className="flex-1">{children}</main>
      {!isWatchPage && <Footer />}
    </>
  );
}
