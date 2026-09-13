'use client';

import Link from 'next/link';

export default function InfoPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 pt-24">
      <Link href="/" className="text-sm text-theme-primary hover:text-theme-hover transition inline-block mb-8">
        ← AniRoll
      </Link>
      <h1 className="text-3xl font-bold text-white mb-8">{title}</h1>
      <div className="space-y-6 text-gray-300 text-[15px] leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-2 [&_a]:text-theme-primary [&_a:hover]:text-theme-hover">
        {children}
      </div>
    </div>
  );
}
