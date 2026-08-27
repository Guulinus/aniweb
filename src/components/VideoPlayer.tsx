'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import type { StreamLink } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';
import { pushServerData } from '@/lib/syncClient';

interface SkipTime {
  startTime: number;
  endTime: number;
  type: string;
}

interface VideoPlayerProps {
  links: StreamLink[];
  episodeTitle: string;
  animeId?: number;
  idMal?: number | null;
  episodeNum?: number;
  seekTo?: number;
  onComplete?: () => void;
  skipData?: SkipTime | null;
  nextEpisodeUrl?: string;
  coverImage?: string;
  episodeThumbnail?: string;
}

export default function VideoPlayer({ links, episodeTitle, animeId, idMal, episodeNum, seekTo: initialSeekTo, onComplete, skipData, nextEpisodeUrl, coverImage, episodeThumbnail }: VideoPlayerProps) {
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const currentUrlRef = useRef<string>('');
  const [selectedServer, setSelectedServer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);
  const [autoQuality, setAutoQuality] = useState(true);

  const [skipIntro, setSkipIntro] = useState<SkipTime | null>(null);
  const [showSkipBtn, setShowSkipBtn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const qualityDropdownRef = useRef<HTMLDivElement>(null);
  const skipIntroRef = useRef<SkipTime | null>(null);
  const showSkipBtnRef = useRef(false);
  const skipBtnHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isHlsUrl = (url: string) => url.includes('.m3u8') || url.includes('m3u8');
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animeIdRef = useRef<number | undefined>(animeId);
  const coverImageRef = useRef<string | undefined>(coverImage);
  const episodeThumbnailRef = useRef<string | undefined>(episodeThumbnail);
  const linksRef = useRef<StreamLink[]>(links);
  const selectedServerRef = useRef(selectedServer);
  const positionRef = useRef<{time: number; duration: number}>({time: 0, duration: 0});

  useEffect(() => {
    animeIdRef.current = animeId;
  }, [animeId]);

  useEffect(() => {
    coverImageRef.current = coverImage;
  }, [coverImage]);

  useEffect(() => {
    episodeThumbnailRef.current = episodeThumbnail;
  }, [episodeThumbnail]);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  useEffect(() => {
    selectedServerRef.current = selectedServer;
  }, [selectedServer]);

  useEffect(() => {
    if (skipData !== undefined) {
      if (skipData) {
        console.log('[VideoPlayer] Using skipData prop:', skipData);
        setSkipIntro(skipData);
        skipIntroRef.current = skipData;
      } else {
        skipIntroRef.current = null;
        setSkipIntro(null);
      }
      return;
    }
    if (idMal && episodeNum) {
      skipIntroRef.current = null;
      setSkipIntro(null);
      fetch(`/api/aniskip/${idMal}/${episodeNum}`)
        .then(r => r.json())
        .then(data => {
          const op = data.results?.find((r: any) => (r.skipType || r.type) === 'op');
          if (op) {
            const st: SkipTime = { startTime: op.interval.startTime, endTime: op.interval.endTime, type: 'op' };
            setSkipIntro(st);
            skipIntroRef.current = st;
          }
        })
        .catch(() => {});
    } else {
      skipIntroRef.current = null;
      setSkipIntro(null);
    }
  }, [idMal, episodeNum, skipData]);



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

    if (!currentTime || !duration || currentTime <= 0) return;

    const remaining = duration - currentTime;
    if (remaining <= 1) {
      localStorage.removeItem(saveKey);
      onComplete?.();
      pushServerData();
      return;
    }

    localStorage.setItem(saveKey, JSON.stringify({
      time: currentTime,
      duration: duration,
      updatedAt: Date.now()
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
        coverImage: coverImageRef.current || '',
        thumbnail: episodeThumbnailRef.current || '',
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

      const priorMatch = history.find((h: any) =>
        h.animeId === historyEntry.animeId && h.season === historyEntry.season && h.episode === historyEntry.episode
      );
      if (!historyEntry.thumbnail && priorMatch?.thumbnail) historyEntry.thumbnail = priorMatch.thumbnail;

      const newHistory = [historyEntry, ...history.filter((h: any) =>
        !(h.animeId === historyEntry.animeId && h.season === historyEntry.season && h.episode === historyEntry.episode)
      ).slice(0, 50)];
      
      localStorage.setItem('watchHistory', JSON.stringify(newHistory));
    }
    
  }, [getSaveKey, episodeTitle]);

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
    cleanup();

    const currentLinks = linksRef.current;
    const currentServer = selectedServerRef.current;
    const url = currentLinks[currentServer]?.url ?? '';
    if (!url) return;

    if (currentUrlRef.current === url && playerRef.current) {
      return;
    }

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
      layers: [],
      mutex: true,
      shortcut: true,
      // Artplayer requires `customType` to be an object whenever the key is present at all —
      // passing `customType: undefined` for non-HLS links throws ("require 'object' type, but
      // got 'undefined'") and crashes the whole watch page, so the key must be omitted entirely
      // (via spread) rather than set to undefined in the non-HLS branch.
      ...(isHls
        ? {
          customType: {
            m3u8: function (video: HTMLVideoElement, streamUrl: string) {
              if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
              }

              if (Hls.isSupported()) {
                const isVidmoly = streamUrl.includes('vmeas.cloud') || streamUrl.includes('vidmoly');
                const isVoe = streamUrl.includes('cloudwindow-route') || streamUrl.includes('voe-network') || streamUrl.includes('delivery-node');
                const hls = new Hls({
                  enableWorker: true,
                  lowLatencyMode: false,
                  xhrSetup: (xhr: XMLHttpRequest) => {
                    if (isVidmoly) {
                      xhr.setRequestHeader('Referer', 'https://vidmoly.to/');
                      xhr.setRequestHeader('Origin', 'https://vidmoly.to');
                    } else if (isVoe) {
                      xhr.setRequestHeader('Referer', 'https://voe.sx/');
                      xhr.setRequestHeader('Origin', 'https://voe.sx');
                    }
                  },
                  fetchSetup: (context: any, initParams: any) => {
                    if (isVidmoly) {
                      initParams.headers = {
                        ...initParams.headers,
                        'Referer': 'https://vidmoly.to/',
                        'Origin': 'https://vidmoly.to',
                      };
                    } else if (isVoe) {
                      initParams.headers = {
                        ...initParams.headers,
                        'Referer': 'https://voe.sx/',
                        'Origin': 'https://voe.sx',
                      };
                    }
                    return new Request(context.url, initParams);
                  },
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
                    video.currentTime = seekPosition;
                  }
                });

                hlsRef.current = hls;
              } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = streamUrl;
                video.addEventListener('canplay', () => {
                  if (seekPosition && seekPosition > 0) {
                    video.currentTime = seekPosition;
                  }
                }, { once: true });
              }
            },
          },
        }
        : {}),
    } as any);

    playerRef.current = art;

    const skipBtnHtml = language === 'de' ? 'Intro überspringen' : 'Skip Intro';
    const $player = art.template.$player;
    const skipBtnEl = document.createElement('div');
    skipBtnEl.id = 'art-skip-intro';
    skipBtnEl.innerHTML = `<button style="padding:8px 16px;background:#9333ea;color:white;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;box-shadow:0 4px 6px -1px rgba(0,0,0,0.3)">${skipBtnHtml}</button>`;
    skipBtnEl.style.cssText = 'position:absolute;bottom:80px;right:16px;z-index:999;display:none;opacity:0;transition:opacity 0.5s';
    skipBtnEl.addEventListener('click', () => {
      const v = containerRef.current?.querySelector('video');
      const st = skipIntroRef.current;
      if (v && st) v.currentTime = st.endTime - 1;
      skipBtnEl.style.display = 'none';
      skipBtnEl.style.opacity = '0';
      showSkipBtnRef.current = false;
      if (skipBtnHideTimerRef.current) clearTimeout(skipBtnHideTimerRef.current);
      setShowSkipBtn(false);
    });
    $player.appendChild(skipBtnEl);

    const nextBtnText = language === 'de' ? 'Nächste Folge' : 'Next Episode';
    const nextEl = document.createElement('div');
    nextEl.id = 'art-next-episode';
    nextEl.innerHTML = `
      <div style="position:absolute;bottom:80px;left:16px;z-index:999;display:none;opacity:0;transition:opacity 0.5s" id="art-next-wrapper">
        <div style="color:white;font-size:13px;margin-bottom:6px;text-shadow:0 1px 3px rgba(0,0,0,0.8)" id="art-next-countdown"></div>
        <button style="padding:8px 16px;background:#9333ea;color:white;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;box-shadow:0 4px 6px -1px rgba(0,0,0,0.3)">${nextBtnText}</button>
      </div>`;
    const nextWrapper = nextEl.firstElementChild as HTMLElement;
    const nextCountdown = nextWrapper.querySelector('#art-next-countdown') as HTMLElement;
    const nextButton = nextWrapper.querySelector('button') as HTMLElement;
    let countdownValue = 10;
    let countdownInterval: NodeJS.Timeout | null = null;

    const startCountdown = () => {
      countdownValue = 10;
      updateCountdownText();
      nextWrapper.style.display = '';
      nextWrapper.style.opacity = '1';
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue <= 0) {
          if (countdownInterval) clearInterval(countdownInterval);
          countdownInterval = null;
          nextWrapper.style.opacity = '0';
          setTimeout(() => { nextWrapper.style.display = 'none'; }, 500);
          if (nextEpisodeUrl) window.location.href = nextEpisodeUrl;
          return;
        }
        updateCountdownText();
      }, 1000);
    };

    const updateCountdownText = () => {
      const cdText = language === 'de'
        ? `Nächste Folge in ${countdownValue}s`
        : `Next episode in ${countdownValue}s`;
      nextCountdown.textContent = cdText;
    };

    const stopCountdown = () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      nextWrapper.style.opacity = '0';
      setTimeout(() => { nextWrapper.style.display = 'none'; }, 500);
    };

    nextButton.addEventListener('click', () => {
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = null;
      if (nextEpisodeUrl) window.location.href = nextEpisodeUrl;
    });

    $player.appendChild(nextEl);

    const video = containerRef.current?.querySelector('video');
    if (video) {
      video.addEventListener('pause', () => {
        savePosition();
      });
      let autoAdvanceShown = false;
      video.addEventListener('timeupdate', () => {
        const st = skipIntroRef.current;
        if (st && skipBtnEl) {
          const show = video.currentTime >= st.startTime && video.currentTime < st.endTime;
          if (show && !showSkipBtnRef.current) {
            showSkipBtnRef.current = true;
            skipBtnEl.style.display = '';
            skipBtnEl.style.opacity = '1';
            setShowSkipBtn(true);
            if (skipBtnHideTimerRef.current) clearTimeout(skipBtnHideTimerRef.current);
            skipBtnHideTimerRef.current = setTimeout(() => {
              skipBtnEl.style.opacity = '0';
              setTimeout(() => { if (skipBtnEl.style.opacity === '0') skipBtnEl.style.display = 'none'; }, 500);
            }, 6000);
          } else if (!show && showSkipBtnRef.current) {
            showSkipBtnRef.current = false;
            skipBtnEl.style.display = 'none';
            skipBtnEl.style.opacity = '0';
            setShowSkipBtn(false);
            if (skipBtnHideTimerRef.current) clearTimeout(skipBtnHideTimerRef.current);
          }
        } else if (!st) {
          if (skipBtnEl && skipBtnEl.style.display !== 'none') {
            skipBtnEl.style.display = 'none';
            skipBtnEl.style.opacity = '0';
          }
        }

        if (nextEpisodeUrl && video.duration > 0) {
          const remaining = video.duration - video.currentTime;
          if (remaining <= 1 && remaining > 0 && !autoAdvanceShown) {
            autoAdvanceShown = true;
            startCountdown();
          } else if (remaining > 1 && autoAdvanceShown) {
            autoAdvanceShown = false;
            stopCountdown();
          }
        }
      });
      video.addEventListener('ended', () => {
        if (nextEpisodeUrl && !autoAdvanceShown) {
          autoAdvanceShown = true;
          startCountdown();
        }
      });
    }

    art.on('pause', () => {
      savePosition();
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
    const handleVisibility = () => { if (document.hidden) pushServerData(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

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
      if (animeIdRef.current && time && duration && time > 0 && (duration - time) > 120) {
        const pathParts = window.location.pathname.split('/');
        const slug = pathParts[2] || '';
        const season = pathParts[3] || '1';
        const episode = pathParts[4] || '1';
        const saveKey = `watchPosition:${animeIdRef.current}:${slug}:${season}:${episode}`;
        localStorage.setItem(saveKey, JSON.stringify({
          time: Math.floor(time),
          duration: Math.floor(duration),
          updatedAt: Date.now()
        }));
        console.log('[VideoPlayer] Saved on unmount:', time, 'key:', saveKey);
      }
      pushServerData();
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(e.target as Node)) {
        setShowServerDropdown(false);
      }
      if (qualityDropdownRef.current && !qualityDropdownRef.current.contains(e.target as Node)) {
        setShowQualityDropdown(false);
      }
    }
    if (showDropdown || showServerDropdown || showQualityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown, showServerDropdown, showQualityDropdown]);

  const langPriority = ['Ger-Dub', 'Ger-Sub', 'Eng-Sub'];

  const langGroups = useMemo(() => {
    const groups: Record<string, {index: number; hoster: string; url: string; quality: string}[]> = {};
    links.forEach((link, i) => {
      if (link.hasAds) return;
      const lang = link.language || 'Unknown';
      if (!groups[lang]) groups[lang] = [];
      groups[lang].push({index: i, hoster: link.hoster, url: link.url, quality: link.quality || 'unknown'});
    });
    return groups;
  }, [links]);

  const availableLangs = Object.keys(langGroups);

  const selectBestLink = useCallback((linksArr: {index: number; url: string; quality: string}[]) => {
    const sorted = [...linksArr].sort((a, b) => {
      const aIsHls = a.url.includes('.m3u8') ? 1 : 0;
      const bIsHls = b.url.includes('.m3u8') ? 1 : 0;
      if (aIsHls !== bIsHls) return bIsHls - aIsHls;
      const parseRes = (q: string) => {
        const m = q.match(/(\d+)p/);
        return m ? parseInt(m[1]) : 0;
      };
      return parseRes(b.quality) - parseRes(a.quality);
    });
    return sorted[0];
  }, []);

  const handleServerChange = useCallback((index: number) => {
    setSelectedServer(index);
    setShowDropdown(false);
    setError(null);
  }, []);

  const handleLangChange = useCallback((lang: string) => {
    const group = langGroups[lang];
    if (!group || group.length === 0) return;
    const best = selectBestLink(group);
    if (best) handleServerChange(best.index);
  }, [langGroups, handleServerChange, selectBestLink]);

  useEffect(() => {
    if (links.length === 0) return;
    let bestLang = availableLangs.find(l => langPriority.includes(l));
    if (!bestLang && availableLangs.length > 0) bestLang = availableLangs[0];
    if (!bestLang) return;
    const group = langGroups[bestLang];
    if (!group || group.length === 0) return;
    const best = selectBestLink(group);
    if (best) {
      setSelectedServer(best.index);
    }
  }, [links.length]);

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
  const currentLang = currentLink?.language ?? '';
  const currentHoster = currentLink ? currentLink.hoster.charAt(0).toUpperCase() + currentLink.hoster.slice(1) : '';

  const availableQualities = useMemo(() => {
    const group = langGroups[currentLang];
    if (!group) return [];
    const seen = new Set<string>();
    return group.filter(l => {
      if (seen.has(l.quality)) return false;
      seen.add(l.quality);
      return true;
    });
  }, [langGroups, currentLang]);

  return (
    <div>
      <div className="relative" data-player>
        <div ref={containerRef} className="aspect-video bg-black rounded-lg overflow-hidden" />
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <span className="hidden md:inline-flex items-center text-xs text-gray-400 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-md">
            Space Play · ←→ Seek · ↑↓ Volume · F Fullscreen · M Mute · P PiP
          </span>
          <span className="md:hidden flex items-center text-xs text-gray-400 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-md">
            Tap to play
          </span>
        </div>
      </div>
      {error && (
        <div className="mt-2 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}
      {currentLink && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">
            {currentHoster} · {currentLang} · {links[selectedServer]?.quality ?? '?'}
          </span>
        </div>
      )}
      {availableLangs.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Language buttons */}
          {availableLangs.map((lang) => {
            const isActive = currentLang === lang;
            const label = lang === 'Ger-Dub' ? (language === 'de' ? '🇩🇪 Deutsch (Sync)' : '🇩🇪 German (Dub)')
              : lang === 'Ger-Sub' ? (language === 'de' ? '🇯🇵 Japanisch (Sub)' : '🇯🇵 Japanese (Sub)')
              : lang === 'Eng-Sub' ? (language === 'de' ? '🇬🇧 Englisch (Sub)' : '🇬🇧 English (Sub)')
              : lang;
            return (
              <button
                key={lang}
                onClick={() => handleLangChange(lang)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center ${
                  isActive
                    ? 'bg-theme-primary text-white shadow-lg shadow-theme-primary'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700'
                }`}
              >
                {label} <span className="text-xs opacity-60">({langGroups[lang].length})</span>
              </button>
            );
          })}

          {/* Server dropdown */}
          {currentLang && langGroups[currentLang] && (() => {
            const hosters = [...new Set(langGroups[currentLang].map(h => h.hoster))];
            if (hosters.length <= 1) return null;
            const activeHoster = currentLink?.hoster || '';
            return (
              <div className="relative" ref={serverDropdownRef}>
                <button
                  onClick={() => setShowServerDropdown(!showServerDropdown)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                  {activeHoster || 'Server'}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showServerDropdown && (
                  <div className="absolute left-0 mt-2 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50">
                    {hosters.map(h => {
                      const linksForHoster = langGroups[currentLang].filter(l => l.hoster === h);
                      const bestForHoster = selectBestLink(linksForHoster);
                      return (
                        <button
                          key={h}
                          onClick={() => {
                            if (bestForHoster) handleServerChange(bestForHoster.index);
                            setShowServerDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition ${
                            activeHoster === h
                              ? 'text-theme-primary bg-theme-soft'
                              : 'text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700'
                          }`}
                        >
                          {h.charAt(0).toUpperCase() + h.slice(1)}
                          <span className="text-xs text-gray-500 ml-1">({linksForHoster.length})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Auto / Quality dropdown */}
          <div className="relative" ref={qualityDropdownRef}>
            <button
              onClick={() => setShowQualityDropdown(!showQualityDropdown)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                autoQuality
                  ? 'bg-theme-primary text-white shadow-lg shadow-theme-primary'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700'
              }`}
              title={language === 'de' ? 'Qualität auswählen' : 'Select quality'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {autoQuality ? 'Auto' : (links[selectedServer]?.quality ?? 'Auto')}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showQualityDropdown && (
              <div className="absolute left-0 mt-2 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50">
                <button
                  onClick={() => {
                    setAutoQuality(true);
                    const group = langGroups[currentLang];
                    if (group) {
                      const best = selectBestLink(group);
                      if (best) handleServerChange(best.index);
                    }
                    setShowQualityDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition flex items-center gap-2 ${
                    autoQuality
                      ? 'text-theme-primary bg-theme-soft'
                      : 'text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Auto (Best)
                </button>
                {availableQualities.map((q) => (
                  <button
                    key={q.quality}
                    onClick={() => {
                      setAutoQuality(false);
                      handleServerChange(q.index);
                      setShowQualityDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition ${
                      !autoQuality && links[selectedServer]?.quality === q.quality
                        ? 'text-theme-primary bg-theme-soft'
                        : 'text-gray-300 hover:bg-gray-700 focus-visible:bg-gray-700'
                    }`}
                  >
                    {q.quality}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
