'use client';

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`rounded-lg bg-gray-800 aspect-[3/4] animate-pulse ${className}`}>
      <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-700" />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`h-4 bg-gray-700 rounded animate-pulse ${className}`} />;
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonText({ className = '', width }: { className?: string; width?: string }) {
  return (
    <div className={`h-4 bg-gray-700 rounded animate-pulse ${className}`}
         style={{ width: width || '60%' }} />
  );
}

export function SkeletonEpisodeGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-gray-800 animate-pulse overflow-hidden">
          <div className="aspect-video bg-gray-700" />
          <div className="px-2.5 py-2.5 space-y-2">
            <div className="h-3 bg-gray-700 rounded w-16" />
            <div className="h-2.5 bg-gray-700/60 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonWatchPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-16 pb-32">
      <div className="h-4 bg-gray-700 rounded w-40 mb-3 animate-pulse" />
      <div className="h-6 bg-gray-700 rounded w-64 mb-1 animate-pulse" />
      <div className="h-4 bg-gray-700 rounded w-48 mb-4 animate-pulse" />
      <div className="aspect-video bg-gray-800 rounded-lg animate-pulse mb-6" />
      <SkeletonEpisodeGrid />
    </div>
  );
}

export function SkeletonBanner() {
  return (
    <div className="h-64 md:h-80 bg-gray-800 animate-pulse rounded-lg" />
  );
}