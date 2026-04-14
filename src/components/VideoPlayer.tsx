'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import type { StreamLink } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';

interface VideoPlayerProps {
  links: StreamLink[];
  episodeTitle: string;
  animeId?: number;
  seekTo?: number;
}

export default function VideoPlayer({ links, episodeTitle, animeId, seekTo: initialSeekTo }: VideoPlayerProps) {
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const currentUrlRef = useRef<string>('');
  const [selectedServer, setSelectedServer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSkipControls, setShowSkipControls] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHlsUrl = (url: string) => url.includes('.m3u8') || url.includes('m3u8');
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animeIdRef = useRef<number | undefined>(animeId);
  const linksRef = useRef<StreamLink[]>(links);
  const selectedServerRef = useRef(selectedServer);
  const positionRef = useRef<{time: number; duration: number}>({time: 0, duration: 0});

  useEffect(() => {
    animeIdRef.current = animeId;
  }, [animeId]);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  useEffect(() => {
    selectedServerRef.current = selectedServer;
  }, [selectedServer]);

  const getSaveKey = useCallback(() => {
    if (!animeIdRef.current) return null;
    const pathParts = window.location.pathname.split('/');
    const slug = pathParts[2] || '';
    const season = pathParts[3] || '1';
    const episode = pathParts[4] || '1';
    return `watchPosition:${animeIdRef.current}:${slug}:${season}:${episode}`;
  }, []);

  const savePosition = useCallback(() => {
    const saveKey = getSaveKey();
    if (!saveKey) return;

    const video = containerRef.current?.querySelector('video');
    if (!video) return;

    const currentTime = Math.floor(video.currentTime);
    const duration = Math.floor(video.duration);

    if (!currentTime || !duration || currentTime <= 0 || currentTime / duration >= 0.9) return;

    localStorage.setItem(saveKey, JSON.stringify({
      time: currentTime,
      duration: duration,
      updated: Date.now()
    }));

    const pathParts = window.location.pathname.split('/');
    const slug = pathParts[2] || '';
    const season = parseInt(pathParts[3] || '1');
    const episode = parseInt(pathParts[4] || '1');
    
    if (animeIdRef.current) {
      const currentLink = linksRef.current[selectedServerRef.current];
      const historyEntry = {
        animeId: animeIdRef.current,
        animeSlug: slug,
        title: episodeTitle.split(' - ')[0] || episodeTitle,
        episodeTitle: episodeTitle,
        coverImage: '',
        season,
        episode,
        hoster: currentLink?.hoster || '',
        language: currentLink?.language || '',
        watchedAt: Date.now()
      };
      
      const existing = localStorage.getItem('watchHistory');
      let history: any[] = [];
      if (existing) {
        try { history = JSON.parse(existing); } catch {}
      }
      
      const newHistory = [historyEntry, ...history.filter((h: any) => 
        !(h.animeId === historyEntry.animeId && h.season === historyEntry.season && h.episode === historyEntry.episode)
      ).slice(0, 50)];
      
      localStorage.setItem('watchHistory', JSON.stringify(newHistory));
    }
    
    console.log('[VideoPlayer] Saved position:', currentTime, 'key:', saveKey);
  }, [getSaveKey, episodeTitle]);

  const getVideo = useCallback((): HTMLVideoElement | null => {
    const video = containerRef.current?.querySelector('video');
    if (video) return video;
    const artVideo = document.querySelector('.artplayer video');
    return (artVideo as HTMLVideoElement) || null;
  }, []);

  const skipIntro = useCallback((seconds: number) => {
    const video = getVideo();
    if (video) {
      video.currentTime += seconds;
      console.log('[VideoPlayer] Skip intro:', seconds, 'new time:', video.currentTime);
    } else {
      console.log('[VideoPlayer] Video element not found for skipIntro');
    }
  }, [getVideo]);

  const skipToTime = useCallback((time: number) => {
    const video = getVideo();
    if (video && time > 0 && time < video.duration) {
      video.currentTime = time;
      console.log('[VideoPlayer] Skip to time:', time, 'new time:', video.currentTime);
    } else {
      console.log('[VideoPlayer] Video element not found or invalid time for skipToTime');
    }
  }, [getVideo]);

  const cleanup = useCallback(() => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }

    const allVideos = document.querySelectorAll('video');
    allVideos.forEach((video) => {
      if (video.parentElement?.closest('.artplayer')) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    });

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    currentUrlRef.current = '';
  }, []);

  const createPlayer = useCallback((seekTo?: number) => {
    console.log('[VideoPlayer] createPlayer called, animeId:', animeIdRef.current, 'seekTo:', seekTo);
    cleanup();

    const currentLinks = linksRef.current;
    const currentServer = selectedServerRef.current;
    const url = currentLinks[currentServer]?.url ?? '';
    if (!url) return;

    if (currentUrlRef.current === url && playerRef.current) {
      return;
    }

    console.log('[VideoPlayer] Initializing player for:', url);
    currentUrlRef.current = url;
    setError(null);
    const isHls = isHlsUrl(url);
    const seekPosition = seekTo;

    const art = new Artplayer({
      container: containerRef.current,
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
      shortcut: true,
      customType: isHls
        ? {
            m3u8: function (video: HTMLVideoElement, streamUrl: string) {
              console.log('[VideoPlayer] HLS customType called');

              if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
              }

              if (Hls.isSupported()) {
                const hls = new Hls({
                  enableWorker: true,
                  lowLatencyMode: false,
                });
                hls.loadSource(streamUrl);
                hls.attachMedia(video);
                hls.on(Hls.Events.ERROR, (_event: unknown, data: { type: string; fatal: boolean }) => {
                  if (data.fatal) {
                    console.error('[VideoPlayer] HLS fatal error:', data);
                    setError('Failed to load stream. Try another server.');
                  }
                });

                const hasSeeked = { value: false };
                hls.on(Hls.Events.FRAG_LOADED, () => {
                  if (seekPosition && seekPosition > 0 && !hasSeeked.value) {
                    hasSeeked.value = true;
                    console.log('[VideoPlayer] Fragment loaded, seeking to', seekPosition);
                    video.currentTime = seekPosition;
                  }
                });

                hlsRef.current = hls;
              } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = streamUrl;
                video.addEventListener('canplay', () => {
                  if (seekPosition && seekPosition > 0) {
                    console.log('[VideoPlayer] Canplay, seeking to', seekPosition);
                    video.currentTime = seekPosition;
                  }
                }, { once: true });
              }
            },
          }
        : undefined,
    } as any);

    playerRef.current = art;

    art.on('ready', () => {
      console.log('[VideoPlayer] Player ready');
      const video = containerRef.current?.querySelector('video');
      if (video) {
        video.addEventListener('pause', () => {
          console.log('[VideoPlayer] Video pause event');
          savePosition();
        });
        video.addEventListener('play', () => {
          console.log('[VideoPlayer] Video play event');
        });
      }
    });

    art.on('pause', () => {
      console.log('[VideoPlayer] Artplayer pause event fired');
      savePosition();
    });

    art.on('play', () => {
      console.log('[VideoPlayer] Artplayer play event fired');
    });

    saveIntervalRef.current = setInterval(() => {
      const video = containerRef.current?.querySelector('video');
      if (video && !video.paused) {
        positionRef.current = { time: Math.floor(video.currentTime), duration: Math.floor(video.duration) };
        savePosition();
      }
    }, 5000);

    art.on('error', () => {
      if (currentUrlRef.current) {
        setError('Failed to play video. Try another server.');
      }
    });
  }, [links, selectedServer, cleanup, savePosition]);

  useEffect(() => {
    if (!containerRef.current || links.length === 0) return;

    const url = links[selectedServer]?.url ?? '';
    if (!url) return;

    if (url !== currentUrlRef.current) {
      console.log('[VideoPlayer] URL changed, reinitializing');
      currentUrlRef.current = url;
      setError(null);
      createPlayer(initialSeekTo);
    }
  }, [links, selectedServer, createPlayer, initialSeekTo]);

  useEffect(() => {
    return () => {
      console.log('[VideoPlayer] Component unmounting, pos:', positionRef.current);
      const { time, duration } = positionRef.current;
      if (animeIdRef.current && time && duration && time > 0 && time / duration < 0.9) {
        const pathParts = window.location.pathname.split('/');
        const slug = pathParts[2] || '';
        const season = pathParts[3] || '1';
        const episode = pathParts[4] || '1';
        const saveKey = `watchPosition:${animeIdRef.current}:${slug}:${season}:${episode}`;
        localStorage.setItem(saveKey, JSON.stringify({
          time: Math.floor(time),
          duration: Math.floor(duration),
          updated: Date.now()
        }));
        console.log('[VideoPlayer] Saved on unmount:', time, 'key:', saveKey);
      }
      cleanup();
    };
  }, [cleanup]);

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
          <p className="text-lg">{language === 'de' ? 'Kein Stream verfügbar' : 'No stream available'}</p>
          <p className="text-sm mt-2">{language === 'de' ? 'Dieses Episoden ist nicht auf Deutsch verfügbar' : 'This episode is not available in German'}</p>
        </div>
      </div>
    );
  }

  const currentLink = links[selectedServer];
  const currentHoster = currentLink ? currentLink.hoster.charAt(0).toUpperCase() + currentLink.hoster.slice(1) : '';
  const currentLang = currentLink?.language === 'Ger-Dub' ? 'Ger-Dub' : currentLink?.language === 'Ger-Sub' ? 'Ger-Sub' : currentLink?.language ?? '';

  return (
    <div>
      <div ref={containerRef} className="aspect-video bg-black rounded-lg overflow-hidden relative group">
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
          ← → Seek • ↑ ↓ Volume • Space/K Play/Pause • F Fullscreen • M Mute
        </div>
      </div>
      {error && (
        <div className="mt-2 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}
      {links.length > 1 && (
        <div className="mt-4 flex gap-2" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center justify-between flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm"
          >
            <span>{language === 'de' ? 'Server:' : 'Server:'} <span className="font-medium">{currentHoster}</span></span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowSkipControls(!showSkipControls)}
              className={`flex items-center gap-1 px-3 py-2 rounded text-sm text-white transition ${showSkipControls ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              {language === 'de' ? 'Skip' : 'Skip'}
            </button>
            {showSkipControls && (
              <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30 p-3 flex flex-col gap-2 min-w-[200px]">
                <div className="text-xs text-gray-400">{language === 'de' ? 'Intro überspringen:' : 'Skip Intro:'}</div>
                <div className="flex gap-1">
                  <button onClick={() => skipToTime(90)} className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">90s</button>
                  <button onClick={() => skipToTime(120)} className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">2min</button>
                  <button onClick={() => skipToTime(150)} className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">2:30</button>
                </div>
                <div className="text-xs text-gray-400 mt-1">{language === 'de' ? 'Outro überspringen:' : 'Skip Outro:'}</div>
                <button 
                  onClick={() => {
                    const video = containerRef.current?.querySelector('video');
                    if (video && video.duration) {
                      video.currentTime = Math.max(0, video.duration - 90);
                    }
                  }} 
                  className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-center"
                >
                  {language === 'de' ? '-90s vom Ende' : '-90s from end'}
                </button>
                <div className="text-xs text-gray-400 mt-1">{language === 'de' ? 'Manuell:' : 'Manual:'}</div>
                <div className="flex gap-1">
                  <button onClick={() => skipIntro(-30)} className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-center">-30s</button>
                  <button onClick={() => skipIntro(30)} className="flex-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-xs text-center">+30s</button>
                </div>
              </div>
            )}
          </div>
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
