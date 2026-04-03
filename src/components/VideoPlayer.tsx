'use client';

import { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import type { StreamLink } from '@/types';

interface VideoPlayerProps {
  links: StreamLink[];
  episodeTitle: string;
}

export default function VideoPlayer({ links, episodeTitle }: VideoPlayerProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const artInstance = useRef<Artplayer | null>(null);
  const [selectedServer, setSelectedServer] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artRef.current || links.length === 0) return;

    if (artInstance.current) {
      artInstance.current.destroy();
    }

    const art = new Artplayer({
      container: artRef.current,
      url: links[selectedServer]?.url ?? '',
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
    } as any);

    artInstance.current = art;

    return () => {
      art.destroy();
      artInstance.current = null;
    };
  }, [links, selectedServer, episodeTitle]);

  useEffect(() => {
    if (artInstance.current && links[selectedServer]?.url) {
      artInstance.current.switchUrl(links[selectedServer].url);
      setError(null);
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
      {error && (
        <div className="mt-2 text-red-400 text-sm text-center">{error}</div>
      )}
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
