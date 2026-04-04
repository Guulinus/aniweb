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
  const [selectedServer, setSelectedServer] = useState(0);

  useEffect(() => {
    if (!artRef.current || links.length === 0) return;

    if (artInstance.current) {
      artInstance.current.destroy();
    }

    const url = links[selectedServer]?.url ?? '';
    const isHls = url.includes('.m3u8');

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
                const hls = new Hls();
                hls.loadSource(streamUrl);
                hls.attachMedia(video);
              } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = streamUrl;
              }
            },
          }
        : undefined,
    } as any);

    artInstance.current = art;

    return () => {
      art.destroy();
      artInstance.current = null;
    };
  }, [links, selectedServer]);

  useEffect(() => {
    if (artInstance.current && links[selectedServer]?.url) {
      const url = links[selectedServer].url;
      const isHls = url.includes('.m3u8');
      if (isHls) {
        artInstance.current.switchUrl(url);
        // Re-setup HLS for the new URL
        const video = artInstance.current.template.$video;
        if (video && Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(url);
          hls.attachMedia(video);
        }
      } else {
        artInstance.current.switchUrl(url);
      }
    }
  }, [selectedServer, links]);

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

  return (
    <div>
      <div ref={artRef} className="aspect-video bg-black rounded-lg overflow-hidden" />
      {links.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-400 self-center mr-2">Server:</span>
          {links.map((link, index) => (
            <button
              key={index}
              onClick={() => setSelectedServer(index)}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                selectedServer === index
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {link.hoster}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
