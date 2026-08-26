'use client';
import { useState } from 'react';

interface CoverImageProps {
  src: string;
  alt: string;
  className?: string;
  color?: string | null;
  sizes?: string;
  loading?: 'lazy' | 'eager';
}

const TMDB_WIDTHS = [342, 500, 780];

// TMDB image URLs encode their width in the path (.../t/p/w780/abc.jpg), so we
// can derive a real srcset from just the one URL we already have. AniList's
// CDN has no equivalent width-swappable pattern, so this only kicks in for
// TMDB-sourced images (film posters).
function buildTmdbSrcSet(src: string): string | undefined {
  const match = src.match(/^(https:\/\/image\.tmdb\.org\/t\/p\/)w\d+(\/.+)$/);
  if (!match) return undefined;
  const [, base, path] = match;
  return TMDB_WIDTHS.map((w) => `${base}w${w}${path} ${w}w`).join(', ');
}

// Cover card with a dominant-color placeholder (from AniList's coverImage.color)
// that fades out once the real image has loaded, instead of a hard pop-in.
export default function CoverImage({ src, alt, className, color, sizes, loading = 'lazy' }: CoverImageProps) {
  const [loaded, setLoaded] = useState(false);
  const srcSet = buildTmdbSrcSet(src);

  return (
    <>
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ backgroundColor: color ?? undefined, opacity: loaded ? 0 : 1 }}
        aria-hidden="true"
      />
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        className={`${className ?? ''} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  );
}
