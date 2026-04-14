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

export function SkeletonText({ className = '' }: { className?: string }) {
  return (
    <div className={`h-4 bg-gray-700 rounded animate-pulse ${className}`}
         style={{ width: `${Math.random() * 40 + 40}%` }} />
  );
}

export function SkeletonBanner() {
  return (
    <div className="h-64 md:h-80 bg-gray-800 animate-pulse rounded-lg" />
  );
}