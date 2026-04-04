'use client';

import { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import type { StreamLink } from '@/types';

interface VideoPlayerProps {
  links: StreamLink[];
  episodeTitle: string;
}

export default function VideoPlayer({ links, episodeTitle }: VideoPlayerProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const artInstance = useRef<Artplayer | null>(null);
  const hlsInstance = useRef<Hls | null>(null);
  const [selectedServer, setSelectedServer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHlsUrl = (url: string) => url.includes('.m3u8') || url.includes('m3u8');
  const isDirectVideo = (url: string) => {
    const lower = url.toLowerCase();
    return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mkv');
  };

  useEffect(() => {
    if (!artRef.current || links.length === 0) return;

    if (hlsInstance.current) {
      hlsInstance.current.destroy();
      hlsInstance.current = null;
    }
    if (artInstance.current) {
      artInstance.current.destroy();
      artInstance.current = null;
    }

    const url = links[selectedServer]?.url ?? '';
    if (!url) return;

    setError(null);
    const isHls = isHlsUrl(url);
    const isDirect = isDirectVideo(url);

    const art = new Artplayer({
      container: artRef.current,
      url,
      theme: '#a855f7',
      autoplay: true,
      playbackRate: true,
      aspectRatio: true,
      screenshot: true,
      setting: true,
      pip: true,
      fullscreen: true,
      fullscreenWeb: true,
      mutex: true,
      customType: isHls
        ? {
            m3u8: function (video: HTMLVideoElement, streamUrl: string) {
              if (Hls.isSupported()) {
                const hls = new Hls({
                  enableWorker: true,
                  lowLatencyMode: true,
                });
                hls.loadSource(streamUrl);
                hls.attachMedia(video);
                hls.on(Hls.Events.ERROR, (_event: unknown, data: { type: string; fatal: boolean }) => {
                  if (data.fatal) {
                    console.error('HLS error:', data);
                    setError('Failed to load stream. Try another server.');
                  }
                });
                hlsInstance.current = hls;
              } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = streamUrl;
              }
            },
          }
        : undefined,
    } as any);

    artInstance.current = art;

    art.on('error', () => {
      setError('Failed to play video. Try another server.');
    });

    return () => {
      if (hlsInstance.current) {
        hlsInstance.current.destroy();
        hlsInstance.current = null;
      }
      art.destroy();
      artInstance.current = null;
    };
  }, [links, selectedServer]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleServerChange = (index: number) => {
    setSelectedServer(index);
    setShowDropdown(false);
    setError(null);
  };

  if (links.length === 0) {
    return (
      <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-lg">No stream available</p>
          <p className="text-sm mt-2">This episode is not available in German</p>
        </div>
      </div>
    );
  }

  const currentLink = links[selectedServer];
  const currentHoster = currentLink ? currentLink.hoster.charAt(0).toUpperCase() + currentLink.hoster.slice(1) : '';
  const currentLang = currentLink?.language === 'Ger-Dub' ? 'Ger-Dub' : currentLink?.language === 'Ger-Sub' ? 'Ger-Sub' : currentLink?.language ?? '';

  return (
    <div>
      <div ref={artRef} className="aspect-video bg-black rounded-lg overflow-hidden" />
      {error && (
        <div className="mt-2 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}
      {links.length > 1 && (
        <div className="mt-4 relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center justify-between w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm"
          >
            <span>Change Dub/Sub (Server): <span className="font-medium">{currentHoster}</span> — <span className="opacity-75">{currentLang}</span></span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
              {links.map((link, index) => {
                const hosterName = link.hoster.charAt(0).toUpperCase() + link.hoster.slice(1);
                const language = link.language === 'Ger-Dub' ? '🇩🇪 Ger-Dub' : link.language === 'Ger-Sub' ? '🇩🇪 Ger-Sub' : link.language ?? '';

                return (
                  <button
                    key={index}
                    onClick={() => handleServerChange(index)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition ${
                      selectedServer === index
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span className="font-medium capitalize">{hosterName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-75">{language}</span>
                      <span className="text-xs bg-black/20 px-2 py-0.5 rounded">HD</span>
                      {link.hasAds && (
                        <span className="text-xs bg-yellow-600/80 px-2 py-0.5 rounded">Ads</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
