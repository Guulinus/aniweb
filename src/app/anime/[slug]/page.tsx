'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import EpisodeList from '@/components/EpisodeList';
import RelatedAnime from '@/components/RelatedAnime';
import RecommendationsRow from '@/components/RecommendationsRow';
import type { AnimeDetail, AniworldSeason, RelatedMovie } from '@/types';
import { toSlug } from '@/lib/slug';
import { useWatchlist } from '@/hooks/useWatchlist';
import { sanitizeHtml } from '@/lib/sanitize';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/lib/ToastContext';

function AnimeDetailContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const animeId = parseInt(searchParams.get('id') ?? '0');

  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [seasons, setSeasons] = useState<AniworldSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [aniworldLoading, setAniworldLoading] = useState(true);
  const [aniworldSlug, setAniworldSlug] = useState<string | null>(null);
  const [filmTarget, setFilmTarget] = useState<{ slug: string; season: number; episode: number } | null>(null);
  const [mergedThumbnails, setMergedThumbnails] = useState<Record<number, string> | null>(null);
  const [movies, setMovies] = useState<RelatedMovie[]>([]);
  const [movieSlugs, setMovieSlugs] = useState<Record<number, { slug: string; season: number; episode: number }>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [tmdbId, setTmdbId] = useState<number | null>(null);
  const [episodeDurations, setEpisodeDurations] = useState<Record<number, number>>({});
  const descRef = useRef<HTMLDivElement>(null);

  const { add, remove, isInWatchlist, getEntry } = useWatchlist();
  const { language } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!animeId) { setLoading(false); return; }

    fetch(`/api/anilist/search?id=${animeId}`)
      .then(r => r.json())
      .then((searchData) => {
        if (searchData?.results?.[0]) {
          const data = searchData.results[0];
          setAnime(data);
          // Extract movies from relations
          if (data.relations?.edges) {
            const movieEdges = data.relations.edges.filter(
              (e: any) => e.node?.format === 'MOVIE'
            );
            if (movieEdges.length > 0) {
              const movieList = movieEdges.map((e: any) => ({
                id: e.node.id,
                title: e.node.title,
                coverImage: e.node.coverImage ?? null,
                year: e.node.startDate?.year ?? null,
                relationType: e.relationType,
              }));
              setMovies(movieList);
            }
          }
        } else {
          setAnime(null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [animeId]);

  useEffect(() => {
    if (!anime) return;

    if (anime.format === 'MOVIE') {
      const movieTitle = anime.title.english || anime.title.romaji;
      fetch(`/api/aniworld/find-movie?title=${encodeURIComponent(movieTitle)}${anime.year ? `&year=${anime.year}` : ''}`)
        .then(r => r.json())
        .then((data: any) => {
          if (data.found && data.slug) {
            setAniworldSlug(data.slug);
            setFilmTarget({ slug: data.slug, season: data.season, episode: data.episode });
            localStorage.setItem(`aniworldSlug:${anime.id}`, data.slug);
            return fetch(`/api/aniworld/series/${data.slug}`).then(r => r.json());
          }
          return null;
        })
        .then((seriesData: any) => {
          if (seriesData?.available && seriesData.seasons?.length > 0) {
            setSeasons(seriesData.seasons);
          }
        })
        .catch(() => {})
        .finally(() => setAniworldLoading(false));
      return;
    }

    setAniworldLoading(true);

    let cachedSlug = null;
    try { cachedSlug = localStorage.getItem(`aniworldSlug:${anime.id}`); } catch {}
    if (cachedSlug) {
      setAniworldSlug(cachedSlug);
      fetch(`/api/aniworld/series/${cachedSlug}`)
        .then(r => r.json())
        .then((data) => {
          if (data.available && data.seasons?.length > 0) {
            setSeasons(data.seasons);
          }
        })
        .catch(() => {})
        .finally(() => setAniworldLoading(false));
      return;
    }

    const title = anime.title.romaji;
    const englishTitle = anime.title.english;
    const year = anime.year;

    fetch(`/api/aniworld/find?title=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}${englishTitle ? `&english=${encodeURIComponent(englishTitle)}` : ''}`)
      .then(r => r.json())
      .then((data) => {
        if (data.found && data.seasons?.length > 0) {
          setAniworldSlug(data.slug);
          setSeasons(data.seasons);
          localStorage.setItem(`aniworldSlug:${anime.id}`, data.slug);
          let watchlistRaw = '[]';
          try { watchlistRaw = localStorage.getItem('watchlist') ?? '[]'; } catch {}
          const watchlistData = JSON.parse(watchlistRaw);
          const entry = watchlistData.find((e: any) => e.animeId === anime.id);
          if (entry) {
            entry.aniworldSlug = data.slug;
            try { localStorage.setItem('watchlist', JSON.stringify(watchlistData)); } catch {}
          }
        }
      })
      .catch(() => {})
      .finally(() => setAniworldLoading(false));
  }, [anime]);

  // Fetch TMDB thumbnails when anime + seasons are ready
  useEffect(() => {
    if (!anime || seasons.length === 0) return;

    const seasonNumbers = seasons.map(s => s.seasonNumber);
    const romaji = anime.title.romaji;
    const english = anime.title.english;

    fetch(`/api/tmdb/thumbnails?romaji=${encodeURIComponent(romaji)}${english ? `&english=${encodeURIComponent(english)}` : ''}&seasons=${seasonNumbers.join(',')}`)
      .then(r => r.json())
      .then((data) => {
        if (!data.thumbnails || Object.keys(data.thumbnails).length === 0) {
          if (data.tmdbId) setTmdbId(data.tmdbId);
          return;
        }

        if (data.tmdbId) setTmdbId(data.tmdbId);

        // Merge: TMDB wins over AniList for overlapping indices
        let globalOffset = 0;
        const merged: Record<number, string> = { ...anime.episodeThumbnails };

        for (const season of seasons) {
          const tmdbSeason = data.thumbnails[season.seasonNumber] as Record<string, Record<number, string>> | undefined;
          if (tmdbSeason) {
            for (const [epNumStr, epThumbUrl] of Object.entries(tmdbSeason)) {
              const epNum = parseInt(epNumStr);
              if (typeof epThumbUrl === 'string') {
                merged[globalOffset + epNum] = epThumbUrl;
              }
            }
          }
          globalOffset += season.episodes.length;
        }

        setMergedThumbnails(merged);
      })
      .catch(() => {});
  }, [anime, seasons]);

  // Fetch episode durations from TMDB when tmdbId is known
  useEffect(() => {
    if (!tmdbId || seasons.length === 0) return;
    let cancelled = false;

    const nonZeroSeasons = seasons.filter(s => s.seasonNumber > 0);
    if (nonZeroSeasons.length === 0) return;

    // Compute global offset per season
    const seasonOffsets: Record<number, number> = {};
    let offset = 0;
    for (const season of seasons) {
      seasonOffsets[season.seasonNumber] = offset;
      offset += season.episodes.length;
    }

    Promise.all(nonZeroSeasons.map(sn =>
      fetch(`/api/tmdb/episode-durations?tmdbId=${tmdbId}&season=${sn.seasonNumber}`)
        .then(r => r.json())
        .then((data: { durations?: Record<number, number> }) => {
          if (cancelled || !data.durations) return;
          const globalOffset = seasonOffsets[sn.seasonNumber] ?? 0;
          const updates: Record<number, number> = {};
          for (const ep of sn.episodes) {
            if (data.durations[ep.number]) {
              updates[globalOffset + ep.number] = data.durations[ep.number];
            }
          }
          if (Object.keys(updates).length > 0) {
            setEpisodeDurations(prev => ({ ...prev, ...updates }));
          }
        })
        .catch(() => {})
    )).catch(() => {});

    return () => { cancelled = true; };
  }, [tmdbId, seasons]);

  // Fetch aniworld episode data for each movie (with cache)
  useEffect(() => {
    if (movies.length === 0) return;
    let cancelled = false;
    const fetches = movies.map(async (m) => {
      const cached = localStorage.getItem(`aniworldSlug:${m.id}`);
      if (cached) {
        try {
          const slugData = JSON.parse(cached);
          if (slugData?.slug) {
            setMovieSlugs(prev => ({ ...prev, [m.id]: slugData }));
            return;
          }
        } catch {}
      }
      const searchTitle = m.title.english || m.title.romaji;
      try {
        const res = await fetch(`/api/aniworld/find-movie?title=${encodeURIComponent(searchTitle)}${m.year ? `&year=${m.year}` : ''}`);
        const data = await res.json();
        if (!cancelled && data.found && data.slug && data.season != null && data.episode != null) {
          const entry = { slug: data.slug, season: data.season, episode: data.episode };
          setMovieSlugs(prev => ({ ...prev, [m.id]: entry }));
          localStorage.setItem(`aniworldSlug:${m.id}`, JSON.stringify(entry));
        }
      } catch {}
    });
    Promise.allSettled(fetches);
    return () => { cancelled = true; };
  }, [movies]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-72 bg-gray-800 rounded-xl" />
          <div className="flex gap-6">
            <div className="w-40 h-60 bg-gray-800 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="h-8 w-64 bg-gray-800 rounded" />
              <div className="h-4 w-48 bg-gray-800 rounded" />
              <div className="h-4 w-full bg-gray-800 rounded" />
              <div className="h-4 w-3/4 bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <svg className="w-20 h-20 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg text-gray-400 mb-2">{language === 'de' ? 'Anime nicht gefunden' : 'Anime not found'}</p>
        <Link href="/browse" className="text-sm text-theme-primary hover:text-theme-hover transition">
          {language === 'de' ? 'Anime durchstöbern →' : 'Browse anime →'}
        </Link>
      </div>
    );
  }

  const title = anime.title.english ?? anime.title.romaji;
  const displaySlug = toSlug(title);
  const inWatchlist = isInWatchlist(anime.id);
  const currentEntry = getEntry(anime.id);

  const handleWatchlistToggle = () => {
    if (inWatchlist) {
      remove(anime.id);
      showToast(language === 'de' ? 'Von Merkliste entfernt' : 'Removed from watchlist', 'error');
    } else {
      add({
        animeId: anime.id,
        animeSlug: displaySlug,
        title,
        coverImage: anime.coverImage.large || anime.coverImage.medium,
        status: 'PLANNING',
        totalEpisodes: anime.episodes,
      });
      showToast(language === 'de' ? 'Zur Merkliste hinzugefügt' : 'Added to watchlist', 'success');
    }
  };

  const getStatusLabel = () => {
    if (currentEntry?.status === 'WATCHING') return language === 'de' ? 'Anschauen' : 'Watching';
    if (currentEntry?.status === 'COMPLETED') return language === 'de' ? 'Abgeschlossen' : 'Completed';
    return language === 'de' ? 'Später ansehen' : 'Plan to Watch';
  };

  const getWatchButtonLabel = () => {
    if (!currentEntry) return language === 'de' ? 'Jetzt ansehen' : 'Watch Now';
    if (currentEntry.status === 'COMPLETED') return language === 'de' ? 'Erneut anschauen' : 'Watch Again';
    return language === 'de'
      ? `Weiterschauen E${currentEntry.currentEpisode ?? 1}`
      : `Continue E${currentEntry.currentEpisode ?? 1}`;
  };

  const titleSeasonMatch = (title.match(/season\s*(\d+)/i) ?? title.match(/part\s*(\d+)/i));
  const titleSeason = titleSeasonMatch ? parseInt(titleSeasonMatch[1]) : null;
  const watchSeason = currentEntry?.currentSeason ?? titleSeason ?? 1;
  const watchEpisode = currentEntry?.currentEpisode ?? 1;

  const watchHref = filmTarget
    ? `/watch/${filmTarget.slug}/${filmTarget.season}/${filmTarget.episode}?id=${anime.id}`
    : `/watch/${displaySlug}/${watchSeason}/${watchEpisode}?id=${anime.id}`;

  const watchLabel = filmTarget
    ? (language === 'de' ? 'Film ansehen' : 'Watch Movie')
    : getWatchButtonLabel();

  return (
    <div className="relative">
      {/* Hero Banner */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src={anime.bannerImage || anime.coverImage.large || anime.coverImage.medium}
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,15,1) 0%, rgba(10,10,15,0) 20%, rgba(10,10,15,0) 70%, rgba(10,10,15,1) 100%)' }}
        />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 relative z-10 -mt-40">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 w-48 md:w-56">
            <div className="relative overflow-hidden rounded-xl shadow-2xl shadow-black/50">
              <img
                src={anime.coverImage.large || anime.coverImage.medium}
                alt={title}
                className="w-full aspect-[3/4] object-cover"
                loading="eager"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-2 md:pt-16">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-300 mb-3">
              {anime.format && <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded uppercase">{anime.format}</span>}
              {anime.episodes && <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded">{anime.episodes} EP</span>}
              {anime.year && <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded">{anime.year}</span>}
              <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded">{anime.status?.replace(/_/g, ' ')}</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 leading-tight">{title}</h1>
            {anime.title.romaji !== title && (
              <p className="text-base text-gray-400 mb-4">{anime.title.romaji}</p>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-5">
              {anime.genres.map((genre) => (
                <Link
                  key={genre}
                  href={`/browse?genre=${encodeURIComponent(genre)}`}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 transition text-gray-200 text-sm rounded-full flex items-center"
                >
                  {genre}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Link
                href={watchHref}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-base transition shadow-lg"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  boxShadow: '0 4px 14px var(--color-primary-shadow)',
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                {watchLabel}
              </Link>
              <button
                onClick={handleWatchlistToggle}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition border ${
                  inWatchlist
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
                style={{
                  backgroundColor: inWatchlist ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                  borderColor: inWatchlist ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)',
                }}
                onMouseEnter={(e) => {
                  if (!inWatchlist) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                }}
                onMouseLeave={(e) => {
                  if (!inWatchlist) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill={inWatchlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={inWatchlist ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} />
                </svg>
                {inWatchlist ? getStatusLabel() : (language === 'de' ? 'Merkliste' : 'Watchlist')}
              </button>
            </div>

            {/* Description */}
            {anime.description && (
              <div className="relative max-w-3xl">
                <div
                  ref={descRef}
                  className="text-gray-300 text-sm leading-relaxed"
                  style={{ maxHeight: isExpanded ? 'none' : '4.5em', overflow: 'hidden' }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(anime.description) }}
                />
                {!isExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to top, var(--bg-primary, #0a0a0f), transparent)' }} />
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm mt-1 relative z-10 transition hover:opacity-80"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {isExpanded
                    ? (language === 'de' ? 'Weniger anzeigen' : 'Show less')
                    : (language === 'de' ? 'Mehr anzeigen' : 'Show more')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Episodes */}
        <section className="mt-12 mb-10 animate-fade-in stagger-3">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {language === 'de' ? 'Episoden' : 'Episodes'}
              {aniworldLoading && (
                <span className="text-sm font-normal text-gray-400 ml-2">
                  ({language === 'de' ? 'Verfügbarkeit wird geprüft...' : 'checking availability...'})
                </span>
              )}
            </h2>
          </div>
          {aniworldLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <EpisodeList
              key={anime.id}
              animeSlug={displaySlug}
              aniworldSlug={filmTarget?.slug ?? aniworldSlug}
              animeId={anime.id}
              seasons={seasons}
              defaultSeason={filmTarget ? filmTarget.season : (titleSeason ?? 1)}
              episodeThumbnails={mergedThumbnails ?? anime.episodeThumbnails}
              episodeDurations={episodeDurations}
              movies={movies}
              movieSlugs={movieSlugs}
            />
          )}
        </section>

        <RelatedAnime relations={anime.relations} />
        <RecommendationsRow animeId={anime.id} />
      </div>
    </div>
  );
}

export default function AnimeDetailPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-16">
      <div className="h-72 bg-gray-800 rounded-xl animate-pulse mb-6" />
      <div className="flex gap-6">
        <div className="w-48 h-64 bg-gray-800 rounded-xl animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-4 pt-4">
          <div className="h-4 w-48 bg-gray-800 rounded animate-pulse" />
          <div className="h-8 w-72 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-36 bg-gray-800 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-gray-800 rounded-full animate-pulse" />
            <div className="h-6 w-24 bg-gray-800 rounded-full animate-pulse" />
            <div className="h-6 w-16 bg-gray-800 rounded-full animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>}>
      <AnimeDetailContent slug={params.slug} />
    </Suspense>
  );
}
