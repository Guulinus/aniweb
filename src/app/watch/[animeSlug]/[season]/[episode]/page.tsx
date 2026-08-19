'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import VideoPlayer from '@/components/VideoPlayer';
import type { StreamLink } from '@/types';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useLanguage } from '@/hooks/useLanguage';

function safeParseJSON(str: string, fallback: any) {
  try { return JSON.parse(str); } catch { return fallback; }
}

interface EpisodeThumb {
  episode: number;
  thumbnail?: string;
  title?: string;
  duration?: number;
}

function WatchContent({ animeSlug, season, episode }: { animeSlug: string; season: string; episode: string }) {
  const { language } = useLanguage();
  const searchParams = useSearchParams();

  const notFoundError = language === 'de' ? 'Dieses Anime konnte nicht auf Aniworld gefunden werden' : 'Could not find this anime on Aniworld';
  const noStreamError = language === 'de' ? 'Kein deutscher Stream für dieses Episoden gefunden' : 'No German stream found for this episode';
  const loadError = language === 'de' ? 'Stream konnte nicht geladen werden' : 'Failed to load stream';

  const animeId = parseInt(searchParams.get('id') ?? '0');
  const episodeTitle = searchParams.get('title') ?? '';
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
  const [displaySeason, setDisplaySeason] = useState(parseInt(season));
  const [episodeList, setEpisodeList] = useState<EpisodeThumb[]>([]);
  const [episodeListOpen, setEpisodeListOpen] = useState(false);
  const [seriesSeasons, setSeriesSeasons] = useState<any[]>([]);
  const [mergedThumbnails, setMergedThumbnails] = useState<Record<number, string>>({});
  const [currentEpTitle, setCurrentEpTitle] = useState(episodeTitle);
  const [episodeDurations, setEpisodeDurations] = useState<Record<number, number>>({});

  const animeTitleRef = useRef(animeTitle);
  const coverImageRef = useRef(coverImage);

  const { add, isInWatchlist, getEntry, updateProgress, updateStatus } = useWatchlist();

  const seasonNum = parseInt(season);
  const episodeNum = parseInt(episode);

  useEffect(() => {
    if (!animeTitle) {
      setAnimeTitle(animeSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    }
  }, [animeSlug]);

  useEffect(() => {
    animeTitleRef.current = animeTitle;
    coverImageRef.current = coverImage;
  }, [animeTitle, coverImage]);

  useEffect(() => {
    let cancelled = false;
    if (!idMal || !episodeNum) { setSkipData(undefined); return; }
    fetch(`/api/aniskip/${idMal}/${episodeNum}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const op = data.results?.find((r: any) => (r.skipType || r.type) === 'op');
        if (op) setSkipData({ startTime: op.interval.startTime, endTime: op.interval.endTime, type: 'op' });
        else setSkipData(null);
      })
      .catch(() => setSkipData(null));
    return () => { cancelled = true; };
  }, [idMal, episodeNum]);

  // Fetch series data + episode list
  useEffect(() => {
    const slug = awSlugFromUrl || animeSlug;
    if (!slug) return;

    setEpisodeList([]);

    fetch(`/api/aniworld/series/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.seasons) {
          setSeriesSeasons(data.seasons);
          const seasonData = data.seasons.find((s: any) => s.seasonNumber === displaySeason);
          if (seasonData?.episodes) {
            const eps = seasonData.episodes.map((e: any) => ({
              episode: e.number,
              thumbnail: e.thumbnail || undefined,
              title: e.title || undefined,
            }));
            setEpisodeList(eps);
            const currentEp = eps.find((e: EpisodeThumb) => e.episode === episodeNum);
            if (currentEp?.title) setCurrentEpTitle(currentEp.title);
          }
        }
      })
      .catch(() => {});
  }, [displaySeason, animeSlug, awSlugFromUrl, episodeNum]);

  // Fetch TMDB thumbnails + durations separately when season or title changes
  useEffect(() => {
    const title = animeTitleRef.current;
    if (!title || !displaySeason) { setMergedThumbnails({}); setEpisodeDurations({}); return; }

    setMergedThumbnails({});
    setEpisodeDurations({});

    fetch(`/api/tmdb/thumbnails?romaji=${encodeURIComponent(title)}&seasons=${displaySeason}`)
      .then(r => r.json())
      .then(tmdb => {
        if (tmdb.thumbnails?.[displaySeason]) {
          const thumbs = tmdb.thumbnails[displaySeason] as Record<string, string>;
          const merged: Record<number, string> = {};
          for (const [epStr, url] of Object.entries(thumbs)) {
            merged[parseInt(epStr)] = url as string;
          }
          setMergedThumbnails(merged);
        }
        if (tmdb.tmdbId) {
          fetch(`/api/tmdb/episode-durations?tmdbId=${tmdb.tmdbId}&season=${displaySeason}`)
            .then(r => r.json())
            .then((data: { durations?: Record<number, number> }) => {
              if (data.durations) setEpisodeDurations(data.durations);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [displaySeason, animeTitle]);

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
            setIdMal(a.idMal ?? null);
          } else {
            try {
              const seasonRes = await fetch(`/api/anilist/season-mal?animeId=${animeId}&season=${seasonNum}`);
              const seasonData = await seasonRes.json();
              setIdMal(seasonData.malId ?? a.idMal ?? null);
            } catch { setIdMal(a.idMal ?? null); }
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
      if (awSlugFromUrl) return awSlugFromUrl;
      const cached = localStorage.getItem(`aniworldSlug:${animeId}`);
      if (cached) return cached;
      if (animeId) {
        try {
          const res = await fetch(`/api/aniworld/search?id=${animeId}`);
          const data = await res.json();
          if (data.slug) { localStorage.setItem(`aniworldSlug:${animeId}`, data.slug); return data.slug; }
        } catch {}
      }
      return null;
    };

    resolveSlug().then((slug) => {
      if (cancelled) return;
      if (!slug) { setError(notFoundError); setLoading(false); return; }

      const epId = `${slug}/${seasonNum}/${episodeNum}`;
      fetch(`/api/aniworld/episode/${epId}`)
        .then(r => r.json())
        .then((data) => {
          if (cancelled) return;
          if (data.available && data.links?.length > 0) {
            setLinks(data.links);

            const savedKey = `watchPosition:${animeId}:${animeSlug}:${seasonNum}:${episodeNum}`;
            const savedData = localStorage.getItem(savedKey);
            let foundSeek = false;
            if (savedData) {
              try {
                const parsed = JSON.parse(savedData);
                const timeSinceSave = Date.now() - (parsed.updatedAt || parsed.updated || 0);
                const progress = parsed.time / parsed.duration;
                if (timeSinceSave < 86400000 && parsed.time > 0 && progress < 0.9) { setSeekTo(parsed.time); foundSeek = true; }
              } catch {}
            }
            if (!foundSeek) setSeekTo(undefined);

            const history = safeParseJSON(localStorage.getItem('watchHistory') ?? '[]', []);
            const entry = { animeSlug, animeId, season: seasonNum, episode: episodeNum, title: animeTitleRef.current, timestamp: Date.now() };
            const filtered = history.filter((h: any) => !(h.animeSlug === animeSlug && h.season === seasonNum && h.episode === episodeNum));
            try { localStorage.setItem('watchHistory', JSON.stringify([entry, ...filtered].slice(0, 50))); } catch {}

            if (isInWatchlist(animeId)) {
              const existing = getEntry(animeId);
              if (existing && existing.status === 'PLANNING') updateStatus(animeId, 'WATCHING');
              updateProgress(animeId, episodeNum);
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
                animeId, animeSlug,
                title: animeTitleRef.current ?? animeSlug.replace(/-/g, ' '),
                coverImage: coverImageRef.current,
                status: 'WATCHING', currentEpisode: episodeNum,
                aniworldSlug: slug ?? undefined, lastWatched: Date.now(),
                currentSeason: seasonNum, updatedAt: Date.now(),
              });
            }
          } else {
            setError(data.error || noStreamError);
          }
        })
        .catch((err) => { if (!cancelled) setError(`${loadError}: ${err?.message || err}`); })
        .finally(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; };
  }, [animeSlug, seasonNum, episodeNum, animeId, awSlugFromUrl]);

  const nextEpisodeLink = `/watch/${animeSlug}/${seasonNum}/${episodeNum + 1}?id=${animeId}${awSlugFromUrl ? `&awSlug=${encodeURIComponent(awSlugFromUrl)}` : ''}`;

  const handleSeasonChange = (newSeason: number) => {
    setDisplaySeason(newSeason);
    window.history.pushState({}, '', `/watch/${animeSlug}/${newSeason}/1?id=${animeId}${awSlugFromUrl ? `&awSlug=${awSlugFromUrl}` : ''}`);
  };

  const sortedSeasons = [...seriesSeasons].sort((a: any, b: any) => a.seasonNumber - b.seasonNumber);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-16 pb-32">
      <Link
        href={`/anime/${animeSlug}?id=${animeId}`}
        className="inline-flex items-center gap-1 text-sm text-theme-primary hover:text-theme-hover focus-visible:text-theme-hover transition mb-3"
      >
        ← {language === 'de' ? 'Zurück zum Anime' : 'Back to anime'}
      </Link>
      <h1 className="text-xl font-bold text-white mb-1">
        {animeTitle || animeSlug.replace(/-/g, ' ')}
      </h1>
      <p className="text-sm text-gray-400 mb-4">
        {seasonNum === 0
          ? (currentEpTitle || (language === 'de' ? 'Film' : 'Movie'))
          : (
            <>
              {language === 'de' ? `Staffel ${seasonNum} · Episode ${episodeNum}` : `Season ${seasonNum} · Episode ${episodeNum}`}
              {currentEpTitle && <span className="text-gray-500"> — {currentEpTitle}</span>}
            </>
          )}
      </p>

      {loading ? (
        <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Stream wird geladen...</p>
          </div>
        </div>
      ) : error ? (
        <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="text-lg">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-hover focus-visible:bg-theme-hover transition">
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <VideoPlayer links={links} episodeTitle={currentEpTitle || episodeTitle} animeId={animeId} idMal={idMal} episodeNum={episodeNum} seekTo={seekTo} skipData={skipData} onComplete={() => setCompleted(true)} nextEpisodeUrl={nextEpisodeLink} />
          {completed && nextEpisodeLink && (
            <div className="mt-4 p-4 bg-theme-soft border border-theme-soft rounded-lg">
              <p className="text-sm text-theme-primary mb-2">
                {language === 'de' ? 'Episode abgeschlossen!' : 'Episode completed!'}
              </p>
              <Link href={nextEpisodeLink} className="inline-block px-4 py-2 bg-theme-primary hover:bg-theme-hover focus-visible:bg-theme-hover text-white rounded-lg font-medium transition">
                {language === 'de' ? 'Nächste Folge →' : 'Next Episode →'}
              </Link>
            </div>
          )}
        </>
      )}

      {/* Episode List */}
      {sortedSeasons.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setEpisodeListOpen(!episodeListOpen)}
            aria-expanded={episodeListOpen}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-800/50 hover:bg-gray-700 focus-visible:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition w-full sm:w-auto"
          >
            <svg className={`w-4 h-4 transition-transform duration-300 ${episodeListOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {language === 'de' ? 'Episoden' : 'Episodes'}
            <span className="text-gray-500 text-xs">({episodeList.length})</span>
          </button>

          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: episodeListOpen ? `${Math.ceil(episodeList.length / 4) * 130 + 80}px` : '0px' }}
          >
            <div className="pt-4">
              <div className="flex flex-wrap gap-2 mb-5">
                {sortedSeasons.map((s: any) => (
                  <button
                    key={s.seasonNumber}
                    onClick={() => handleSeasonChange(s.seasonNumber)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center ${
                      displaySeason === s.seasonNumber
                        ? 'bg-theme-primary text-white'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white focus-visible:bg-gray-700 focus-visible:text-white'
                    }`}
                  >
                    {s.seasonNumber === 0 ? 'Filme' : (language === 'de' ? `Staffel ${s.seasonNumber}` : `Season ${s.seasonNumber}`)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {episodeList.map(ep => {
                  const isActive = ep.episode === episodeNum;
                  const thumb = mergedThumbnails[ep.episode] || ep.thumbnail || null;
                  return (
                    <Link
                      key={ep.episode}
                      href={`/watch/${animeSlug}/${displaySeason}/${ep.episode}?id=${animeId}${awSlugFromUrl ? `&awSlug=${awSlugFromUrl}` : ''}`}
                      className={`group block rounded-xl overflow-hidden transition-all duration-200 ${
                        isActive ? 'ring-2 ring-theme-primary ring-offset-2 ring-offset-[#0a0a0f]' : ''
                      }`}
                    >
                      <div className="relative aspect-video bg-gray-800 overflow-hidden">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 group-focus-visible:scale-105 transition-transform duration-300" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        )}
                        {isActive && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                              <svg className="w-5 h-5 text-theme-primary ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="px-2.5 py-2">
                        <p className={`text-xs font-bold ${isActive ? 'text-theme-primary' : 'text-white'}`}>
                          E{ep.episode}
                        </p>
                        {ep.title && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{ep.title}</p>
                        )}
                        {episodeDurations[ep.episode] && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{episodeDurations[ep.episode]}m</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WatchPage({ params }: { params: { animeSlug: string; season: string; episode: string } }) {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 pt-16 pb-32">
      <div className="h-4 bg-gray-800 rounded w-40 mb-3 animate-pulse" />
      <div className="h-6 bg-gray-800 rounded w-64 mb-1 animate-pulse" />
      <div className="h-4 bg-gray-800 rounded w-48 mb-4 animate-pulse" />
      <div className="aspect-video bg-gray-800 rounded-lg animate-pulse" />
    </div>}>
      <WatchContent animeSlug={params.animeSlug} season={params.season} episode={params.episode} />
    </Suspense>
  );
}
