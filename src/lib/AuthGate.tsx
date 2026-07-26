'use client';

import { useAuth } from '@/lib/AuthContext';
import { ReactNode } from 'react';

export function AuthGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <nav className="sticky top-0 z-50 bg-[#0a0a0f] border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center h-14 md:h-16">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AR</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                  AniRoll
                </span>
              </div>
            </div>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-theme-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
