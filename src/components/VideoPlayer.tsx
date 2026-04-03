'use client';

import { useState } from 'react';
import type { StreamLink } from '@/types';

interface VideoPlayerProps {
  links: StreamLink[];
  episodeTitle: string;
}

export default function VideoPlayer({ links, episodeTitle }: VideoPlayerProps) {
  const [selectedServer, setSelectedServer] = useState(0);

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

  const currentUrl = links[selectedServer]?.url ?? '';
  const proxyUrl = `/api/proxy/embed?url=${encodeURIComponent(currentUrl)}`;

  return (
    <div>
      <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
        <iframe
          key={proxyUrl}
          src={proxyUrl}
          className="w-full h-full"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
          title={episodeTitle}
        />
      </div>
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
