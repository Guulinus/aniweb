'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import VideoPlayer from '@/components/VideoPlayer';
import type { StreamLink } from '@/types';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useLanguage } from '@/hooks/useLanguage';

function safeParseJSON(str: string, fallback: any) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function WatchContent({ animeSlug, season, episode }: { animeSlug: string; season: string; episode: string }) {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  
  const notFoundError = language === 'de' ? 'Dieses Anime konnte nicht auf Aniworld gefunden werden' : 'Could not find this anime on Aniworld';
  const noStreamError = language === 'de' ? 'Kein deutscher Stream für dieses Episoden gefunden' : 'No German stream found for this episode';
  const loadError = language === 'de' ? 'Stream konnte nicht geladen werden' : 'Failed to load stream';

  const animeId = parseInt(searchParams.get('id') ?? '0');
  const episodeTitle = searchParams.get('title') ?? `Episode ${episode}`;
  const awSlugFromUrl = searchParams.get('awSlug');

  const [links, setLinks] = useState<StreamLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animeTitle, setAnimeTitle] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string>('');
  const [idMal, setIdMal] = useState<number | null>(null);
  const [skipData, setSkipData] = useState<{startTime: number; endTime: number; type: string} | null | undefined>(undefined);
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);
  const [completed, setCompleted] = useState(false);

  const animeTitleRef = useRef(animeTitle);
  const coverImageRef = useRef(coverImage);

  const { add, isInWatchlist, getEntry, updateProgress, updateStatus } = useWatchlist();

  const seasonNum = parseInt(season);
  const episodeNum = parseInt(episode);

  useEffect(() => {
    animeTitleRef.current = animeTitle;
    coverImageRef.current = coverImage;
  }, [animeTitle, coverImage]);

  useEffect(() => {
    let cancelled = false;
    if (!idMal || !episodeNum) {
      setSkipData(undefined);
      return;
    }
    console.log('[Watch] Fetching skip data for idMal=', idMal, 'ep=', episodeNum);
    fetch(`/api/aniskip/${idMal}/${episodeNum}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const op = data.results?.find((r: any) => (r.skipType || r.type) === 'op');
        if (op) {
          const st = { startTime: op.interval.startTime, endTime: op.interval.endTime, type: 'op' };
          console.log('[Watch] Skip data found:', st);
          setSkipData(st);
        } else {
          console.log('[Watch] No OP skip data');
          setSkipData(null);
        }
      })
      .catch(() => setSkipData(null));
    return () => { cancelled = true; };
  }, [idMal, episodeNum]);

  useEffect(() => {
    let cancelled = false;
    if (!animeId) return;
    
    const fetchMal = async () => {
      try {
        const res = await fetch(`/api/anilist/search?id=${animeId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.results?.[0]) {
          const a = data.results[0];
          const rawTitle = a.title.english ?? a.title.romaji ?? '';
          const cleanTitle = rawTitle.replace(/\s*(Season\s*\d+|Part\s*\d+|:.*|-.*)$/i, '').trim();
          setAnimeTitle(cleanTitle || rawTitle);
          setCoverImage(a.coverImage?.large ?? a.coverImage?.medium ?? '');

          if (seasonNum <= 1) {
            console.log('[Watch] Season 1, using main idMal:', a.idMal);
            setIdMal(a.idMal ?? null);
          } else {
            try {
              console.log('[Watch] Fetching season-mal for season:', seasonNum, 'animeId:', animeId);
              const seasonRes = await fetch(`/api/anilist/season-mal?animeId=${animeId}&season=${seasonNum}`);
              const seasonData = await seasonRes.json();
              console.log('[Watch] Season MAL result:', seasonData);
              setIdMal(seasonData.malId ?? a.idMal ?? null);
            } catch (e) {
              console.log('[Watch] Season MAL fetch failed, falling back to main idMal:', a.idMal);
              setIdMal(a.idMal ?? null);
            }
          }
        }
      } catch {}
    };
    fetchMal();
    return () => { cancelled = true; };
  }, [animeId, seasonNum]);

  useEffect(() => {
    if (!animeSlug || isNaN(seasonNum) || isNaN(episodeNum)) return;

    let cancelled = false;
    setLoading(true);

    const resolveSlug = async (): Promise<string | null> => {
      // 1. Use awSlug from URL if provided
      if (awSlugFromUrl) return awSlugFromUrl;
      
      // 2. Check localStorage cache
      const cached = localStorage.getItem(`aniworldSlug:${animeId}`);
      if (cached) return cached;
      
      // 3. Try to find via API search
      if (animeId) {
        try {
          const res = await fetch(`/api/aniworld/search?id=${animeId}`);
          const data = await res.json();
          if (data.slug) {
            localStorage.setItem(`aniworldSlug:${animeId}`, data.slug);
            return data.slug;
          }
        } catch {}
      }
      
      return null;
    };

    resolveSlug().then((slug) => {
      if (cancelled) return;
      if (!slug) {
        setError(notFoundError);
        setLoading(false);
        return;
      }

      const epId = `${slug}/${seasonNum}/${episodeNum}`;
      fetch(`/api/aniworld/episode/${epId}`)
        .then(r => r.json())
        .then((data) => {
          if (cancelled) return;
          if (data.available && data.links?.length > 0) {
            setLinks(data.links);

            // Use the same slug from the URL path that we use for saving
            const pathSlug = animeSlug;
            const savedKey = `watchPosition:${animeId}:${pathSlug}:${seasonNum}:${episodeNum}`;
            const savedData = localStorage.getItem(savedKey);
            let foundSeek = false;
            if (savedData) {
              try {
                const parsed = JSON.parse(savedData);
                const timeSinceSave = Date.now() - (parsed.updatedAt || parsed.updated || 0);
                const progress = parsed.time / parsed.duration;
                if (timeSinceSave < 86400000 && parsed.time > 0 && progress < 0.9) {
                  setSeekTo(parsed.time);
                  foundSeek = true;
                }
              } catch {}
            }
            if (!foundSeek) setSeekTo(undefined);

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
                updateStatus(animeId, 'WATCHING');
              }
              updateProgress(animeId, episodeNum);
              // Manually update aniworldSlug, lastWatched, currentSeason, and coverImage in localStorage
              try {
                const current = JSON.parse(localStorage.getItem('watchlist') ?? '[]');
                const updated = current.map((e: any) => 
                  e.animeId === animeId 
                    ? { ...e, aniworldSlug: slug, lastWatched: Date.now(), currentSeason: seasonNum, coverImage: coverImageRef.current || e.coverImage, updatedAt: Date.now() } 
                    : e
                );
                localStorage.setItem('watchlist', JSON.stringify(updated));
              } catch {}
            } else {
              add({
                animeId,
                animeSlug,
                title: animeTitleRef.current ?? animeSlug.replace(/-/g, ' '),
                coverImage: coverImageRef.current,
                status: 'WATCHING',
                currentEpisode: episodeNum,
                aniworldSlug: slug ?? undefined,
                lastWatched: Date.now(),
                currentSeason: seasonNum,
                updatedAt: Date.now(),
              });
            }
          } else {
            setError(noStreamError);
          }
        })
        .catch(() => {
          if (!cancelled) setError(loadError);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => { cancelled = true; };
  }, [animeSlug, seasonNum, episodeNum, animeId, awSlugFromUrl]);

  const nextEpisodeLink = `/watch/${animeSlug}/${seasonNum}/${episodeNum + 1}?id=${animeId}${awSlugFromUrl ? `&awSlug=${encodeURIComponent(awSlugFromUrl)}` : ''}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Link href={`/anime/${animeSlug}?id=${animeId}`} className="text-theme-primary hover:text-theme-hover focus-visible:text-theme-hover text-sm">
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
              className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-hover focus-visible:bg-theme-hover transition"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <VideoPlayer links={links} episodeTitle={episodeTitle} animeId={animeId} idMal={idMal} episodeNum={episodeNum} seekTo={seekTo} skipData={skipData} onComplete={() => setCompleted(true)} nextEpisodeUrl={nextEpisodeLink} />
          {completed && nextEpisodeLink && (
            <div className="mt-4 p-4 bg-theme-soft border border-theme-soft rounded-lg">
              <p className="text-sm text-theme-primary mb-2">
                {language === 'de' ? 'Episode abgeschlossen!' : 'Episode completed!'}
              </p>
              <Link
                href={nextEpisodeLink}
                className="inline-block px-4 py-2 bg-theme-primary hover:bg-theme-hover focus-visible:bg-theme-hover text-white rounded-lg font-medium transition"
              >
                {language === 'de' ? 'Nächste Folge →' : 'Next Episode →'}
              </Link>
            </div>
          )}
        </>
      )}

      <div className="flex justify-between mt-6">
        <Link
          href={`/watch/${animeSlug}/${seasonNum}/${episodeNum - 1}?id=${animeId}${awSlugFromUrl ? `&awSlug=${encodeURIComponent(awSlugFromUrl)}` : ''}`}
          className={`px-4 py-2 rounded-lg transition ${
            episodeNum > 1
              ? 'bg-gray-800 text-white hover:bg-gray-700 focus-visible:bg-gray-700'
              : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
          }`}
          onClick={(e) => { if (episodeNum <= 1) e.preventDefault(); }}
        >
          ← Previous Episode
        </Link>
        <Link
          href={`/watch/${animeSlug}/${seasonNum}/${episodeNum + 1}?id=${animeId}${awSlugFromUrl ? `&awSlug=${encodeURIComponent(awSlugFromUrl)}` : ''}`}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 focus-visible:bg-gray-700 transition"
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
  params: { animeSlug: string; season: string; episode: string };
}) {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-6 text-gray-400">Loading...</div>}>
      <WatchContent animeSlug={params.animeSlug} season={params.season} episode={params.episode} />
    </Suspense>
  );
}
