'use client';
import { useState, useEffect, Suspense, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

interface StreamLink {
  hoster: string;
  url: string;
  name: string;
  hasAds: boolean;
}

const HOSTER_PRIORITY = ['vidara', 'voe', 'doodstream', 'vidmoly', 'vidoza', 'streamtape', 'filemoon', 'mixdrop', 'upstream', 'vinovo'];

function WatchContent() {
  const params = useParams();
  const slug = params?.slug as string;
  const [links, setLinks] = useState<StreamLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(slug.replace(/-/g, ' '));
  const [selectedLink, setSelectedLink] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!slug) return;
    setTitle(slug.replace(/-/g, ' '));

    fetch(`/api/filmpalast/stream/${slug}?id=${slug}`)
      .then(r => r.json())
      .then(data => {
        const allLinks = (data.links ?? []) as StreamLink[];
        // Sort by priority
        allLinks.sort((a, b) => {
          const aIdx = HOSTER_PRIORITY.indexOf(a.hoster.toLowerCase());
          const bIdx = HOSTER_PRIORITY.indexOf(b.hoster.toLowerCase());
          return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
        });
        setLinks(allLinks);
      })
      .catch(() => setError('Stream konnte nicht geladen werden'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Also fetch title from movie detail
  useEffect(() => {
    fetch(`/api/filmpalast/movie/${slug}?id=${slug}`)
      .then(r => r.json())
      .then(data => { if (data.title) setTitle(data.title); })
      .catch(() => {});
  }, [slug]);

  const titleRef = useRef(title);
  const posterRef = useRef('');
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { titleRef.current = title; }, [title]);

  useEffect(() => {
    fetch(`/api/filmpalast/movie/${slug}?id=${slug}`)
      .then(r => r.json())
      .then(data => { if (data.posterImage) posterRef.current = data.posterImage; })
      .catch(() => {});
  }, [slug]);

  const savePosition = () => {
    const video = containerRef.current?.querySelector('video');
    if (!video) return;
    const currentTime = Math.floor(video.currentTime);
    const duration = Math.floor(video.duration);
    if (!currentTime || !duration || currentTime <= 0) return;

    const remaining = duration - currentTime;
    if (remaining <= 1) {
      localStorage.removeItem(`filmPosition:${slug}`);
      return;
    }

    localStorage.setItem(`filmPosition:${slug}`, JSON.stringify({ time: currentTime, duration, updatedAt: Date.now() }));

    try {
      const existing = JSON.parse(localStorage.getItem('filmHistory') ?? '[]');
      const entry = { slug, title: titleRef.current, posterImage: posterRef.current, watchedAt: Date.now() };
      const updated = [entry, ...existing.filter((h: any) => h.slug !== slug)].slice(0, 50);
      localStorage.setItem('filmHistory', JSON.stringify(updated));
    } catch {}
  };

  useEffect(() => {
    if (!containerRef.current || links.length === 0) return;
    const link = links[selectedLink];
    if (!link || !link.url) return;

    // Destroy old player
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }

    const isHls = link.url.includes('.m3u8');

    const art = new Artplayer({
      container: containerRef.current,
      url: link.url,
      theme: '#a855f7',
      autoplay: true,
      playbackRate: true,
      aspectRatio: true,
      screenshot: true,
      setting: true,
      pip: true,
      fullscreen: true,
      fullscreenWeb: true,
      shortcut: true,
      // Artplayer requires `customType` to be an object whenever the key is present at all —
      // passing `customType: undefined` for non-HLS links throws ("require 'object' type, but
      // got 'undefined'") and crashes the whole page, so the key must be omitted entirely here.
      ...(isHls ? {
        customType: {
          m3u8: function (video: HTMLVideoElement, streamUrl: string) {
            if (Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
                maxBufferLength: 60,
                maxMaxBufferLength: 600,
                startLevel: -1,
              });
              hls.loadSource(streamUrl);
              hls.attachMedia(video);
              hls.on(Hls.Events.ERROR, (_e: unknown, data: { type: string; fatal: boolean }) => {
                if (data.fatal) console.error('HLS error:', data);
              });
              hlsRef.current = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = streamUrl;
            }
          },
        },
      } : {}),
    } as any);

    art.on('ready', () => {
      try {
        const saved = JSON.parse(localStorage.getItem(`filmPosition:${slug}`) ?? 'null');
        if (saved?.time && saved.time > 5) art.seek = saved.time;
      } catch {}
    });

    art.on('pause', savePosition);
    saveIntervalRef.current = setInterval(() => {
      const video = containerRef.current?.querySelector('video');
      if (video && !video.paused) savePosition();
    }, 5000);

    playerRef.current = art;
    return () => {
      if (saveIntervalRef.current) { clearInterval(saveIntervalRef.current); saveIntervalRef.current = null; }
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    };
  }, [links, selectedLink]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
        <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-gray-400 animate-pulse text-lg">Stream wird geladen...</div>
        </div>
      </div>
    );
  }

  if (error || links.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
        <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="text-lg">{error || 'Kein Stream verfügbar'}</p>
            <Link href={`/filme/${slug}`} className="text-theme-primary mt-4 inline-block">← Zurück</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
      <div className="mb-4">
        <Link href={`/filme/${slug}`} className="text-theme-primary hover:text-theme-hover text-sm">
          ← {title}
        </Link>
      </div>

      <div ref={containerRef} className="aspect-video bg-black rounded-lg overflow-hidden" />

      {links.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((link, i) => (
            <button
              key={i}
              onClick={() => setSelectedLink(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                i === selectedLink
                  ? 'bg-theme-primary text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {link.hoster}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        {links[selectedLink]?.hoster}
      </div>
    </div>
  );
}

export default function FilmWatchPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
      <div className="h-4 bg-gray-800 rounded w-40 mb-3 animate-pulse" />
      <div className="h-6 bg-gray-800 rounded w-64 mb-1 animate-pulse" />
      <div className="h-4 bg-gray-800 rounded w-48 mb-4 animate-pulse" />
      <div className="aspect-video bg-gray-800 rounded-lg animate-pulse" />
    </div>}>
      <WatchContent />
    </Suspense>
  );
}
