'use client';

import { useState, useEffect, useRef, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import VideoPlayer from '@/components/VideoPlayer';
import type { StreamLink } from '@/types';
import { useWatchlist } from '@/hooks/useWatchlist';

function safeParseJSON(str: string, fallback: any) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function WatchContent({ animeSlug, season, episode }: { animeSlug: string; season: string; episode: string }) {
  const searchParams = useSearchParams();

  const animeId = parseInt(searchParams.get('id') ?? '0');
  const episodeTitle = searchParams.get('title') ?? `Episode ${episode}`;
  const awSlugFromUrl = searchParams.get('awSlug');

  const [links, setLinks] = useState<StreamLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animeTitle, setAnimeTitle] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string>('');

  const animeTitleRef = useRef(animeTitle);
  const coverImageRef = useRef(coverImage);

  const { add, isInWatchlist, getEntry, updateProgress } = useWatchlist();

  const seasonNum = parseInt(season);
  const episodeNum = parseInt(episode);

  useEffect(() => {
    animeTitleRef.current = animeTitle;
    coverImageRef.current = coverImage;
  }, [animeTitle, coverImage]);

  useEffect(() => {
    let cancelled = false;
    if (!animeId) return;
    fetch(`/api/anilist/search?id=${animeId}`)
      .then(r => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.results?.[0]) {
          const a = data.results[0];
          const rawTitle = a.title.english ?? a.title.romaji ?? '';
          const cleanTitle = rawTitle.replace(/\s*(Season\s*\d+|Part\s*\d+|:.*|-.*)$/i, '').trim();
          setAnimeTitle(cleanTitle || rawTitle);
          setCoverImage(a.coverImage?.large ?? a.coverImage?.medium ?? '');
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [animeId]);

  useEffect(() => {
    if (!animeSlug || isNaN(seasonNum) || isNaN(episodeNum)) return;

    let cancelled = false;
    setLoading(true);

    const resolveSlug = async (): Promise<string | null> => {
      if (awSlugFromUrl) return awSlugFromUrl;
      const cached = localStorage.getItem(`aniworldSlug:${animeId}`);
      if (cached) return cached;
      return null;
    };

    resolveSlug().then((slug) => {
      if (cancelled) return;
      if (!slug) {
        setError('Could not find this anime on Aniworld');
        setLoading(false);
        return;
      }

      const epId = `${slug}/${seasonNum}/${episodeNum}`;
      fetch(`/api/aniworld/episode/${encodeURIComponent(epId)}`)
        .then(r => r.json())
        .then((data) => {
          if (cancelled) return;
          if (data.available && data.links?.length > 0) {
            setLinks(data.links);

            const history = safeParseJSON(localStorage.getItem('watchHistory') ?? '[]', []);
            const entry = { animeSlug, animeId, season: seasonNum, episode: episodeNum, title: animeTitleRef.current, timestamp: Date.now() };
            const filtered = history.filter((h: any) => !(h.animeSlug === animeSlug && h.season === seasonNum && h.episode === episodeNum));
            try {
              localStorage.setItem('watchHistory', JSON.stringify([entry, ...filtered].slice(0, 50)));
            } catch {
              // localStorage full, ignore
            }

            if (isInWatchlist(animeId)) {
              const existing = getEntry(animeId);
              if (existing && existing.status === 'PLANNING') {
                existing.status = 'WATCHING';
              }
              updateProgress(animeId, episodeNum);
            } else {
              add({
                animeId,
                animeSlug,
                title: animeTitleRef.current ?? animeSlug.replace(/-/g, ' '),
                coverImage: coverImageRef.current,
                status: 'WATCHING',
                currentEpisode: episodeNum,
              });
            }
          } else {
            setError('No German stream found for this episode');
          }
        })
        .catch(() => {
          if (!cancelled) setError('Failed to load stream');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => { cancelled = true; };
  }, [animeSlug, seasonNum, episodeNum, animeId, awSlugFromUrl]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Link href={`/anime/${animeSlug}?id=${animeId}`} className="text-purple-400 hover:text-purple-300 text-sm">
          ← Back to anime
        </Link>
      </div>

      <h1 className="text-xl font-bold text-white mb-4">
        {animeTitle ? `${animeTitle} — Season ${seasonNum}, Episode ${episodeNum}` : `Season ${seasonNum}, Episode ${episodeNum}`}
      </h1>

      {loading ? (
        <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-gray-400">Loading stream...</div>
        </div>
      ) : error ? (
        <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="text-lg">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <VideoPlayer links={links} episodeTitle={episodeTitle} />
      )}

      <div className="flex justify-between mt-6">
        <Link
          href={`/watch/${animeSlug}/${seasonNum}/${episodeNum - 1}?id=${animeId}${awSlugFromUrl ? `&awSlug=${encodeURIComponent(awSlugFromUrl)}` : ''}`}
          className={`px-4 py-2 rounded-lg transition ${
            episodeNum > 1
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
          }`}
          onClick={(e) => { if (episodeNum <= 1) e.preventDefault(); }}
        >
          ← Previous Episode
        </Link>
        <Link
          href={`/watch/${animeSlug}/${seasonNum}/${episodeNum + 1}?id=${animeId}${awSlugFromUrl ? `&awSlug=${encodeURIComponent(awSlugFromUrl)}` : ''}`}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
        >
          Next Episode →
        </Link>
      </div>
    </div>
  );
}

export default function WatchPage({
  params,
}: {
  params: Promise<{ animeSlug: string; season: string; episode: string }>;
}) {
  const { animeSlug, season, episode } = use(params);
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-6 text-gray-400">Loading...</div>}>
      <WatchContent animeSlug={animeSlug} season={season} episode={episode} />
    </Suspense>
  );
}
