'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

interface ProfileData {
  profile: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: number;
  };
  stats: {
    watchlist: {
      total: number;
      watching: number;
      completed: number;
      planning: number;
      dropped: number;
    };
    ratingsGiven: number;
    averageRating: number | null;
    totalEpisodesWatched: number;
  };
  recentActivity: Array<{
    key: string;
    animeId: number;
    slug: string;
    season: number;
    episode: number;
    time: number;
    duration: number;
    updatedAt: number;
  }>;
}

export default function ProfilePage() {
  const { language } = useLanguage();
  const params = useParams();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    fetch(`/api/user/profile/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gray-800 rounded-full" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-gray-800 rounded" />
              <div className="h-4 w-24 bg-gray-800 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">
          {language === 'de' ? 'Benutzer nicht gefunden' : 'User not found'}
        </h1>
        <p className="text-gray-400">
          {language === 'de' ? 'Dieses Profil existiert nicht.' : 'This profile does not exist.'}
        </p>
      </div>
    );
  }

  const { profile, stats, recentActivity } = data;
  const joinDate = new Date(profile.createdAt).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Profile header */}
      <div className="flex items-center gap-6 mb-10">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
          {profile.avatarUrl ? (
            <Image src={profile.avatarUrl} alt={profile.username} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-gray-500">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{profile.displayName || profile.username}</h1>
          <p className="text-gray-400 text-sm">
            @{profile.username} &middot; {language === 'de' ? 'Seit' : 'Joined'} {joinDate}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-2xl font-bold text-theme-primary">{stats.watchlist.watching}</p>
          <p className="text-sm text-gray-400">{language === 'de' ? 'Schaut' : 'Watching'}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-2xl font-bold text-green-400">{stats.watchlist.completed}</p>
          <p className="text-sm text-gray-400">{language === 'de' ? 'Abgeschlossen' : 'Completed'}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-2xl font-bold text-blue-400">{stats.ratingsGiven}</p>
          <p className="text-sm text-gray-400">{language === 'de' ? 'Bewertungen' : 'Ratings'}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-2xl font-bold text-yellow-400">{stats.totalEpisodesWatched}</p>
          <p className="text-sm text-gray-400">{language === 'de' ? 'Folgen gesehen' : 'Episodes'}</p>
        </div>
      </div>

      {/* Watchlist breakdown */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">
          {language === 'de' ? 'Merkliste' : 'Watchlist'}
        </h2>
        <div className="flex flex-wrap gap-6">
          <div>
            <span className="text-gray-400 text-sm">{language === 'de' ? 'Gesamt' : 'Total'}:</span>
            <span className="text-white ml-2 font-semibold">{stats.watchlist.total}</span>
          </div>
          <div>
            <span className="text-theme-primary text-sm">{language === 'de' ? 'Schaut' : 'Watching'}:</span>
            <span className="text-white ml-2 font-semibold">{stats.watchlist.watching}</span>
          </div>
          <div>
            <span className="text-green-400 text-sm">{language === 'de' ? 'Abgeschlossen' : 'Completed'}:</span>
            <span className="text-white ml-2 font-semibold">{stats.watchlist.completed}</span>
          </div>
          <div>
            <span className="text-blue-400 text-sm">{language === 'de' ? 'Geplant' : 'Planning'}:</span>
            <span className="text-white ml-2 font-semibold">{stats.watchlist.planning}</span>
          </div>
          <div>
            <span className="text-red-400 text-sm">{language === 'de' ? 'Abgebrochen' : 'Dropped'}:</span>
            <span className="text-white ml-2 font-semibold">{stats.watchlist.dropped}</span>
          </div>
        </div>
        {stats.averageRating !== null && (
          <div className="mt-3">
            <span className="text-yellow-400 text-sm">
              {language === 'de' ? 'Durchschnittliche Bewertung' : 'Average rating'}:
            </span>
            <span className="text-white ml-2 font-semibold">{stats.averageRating}/10</span>
          </div>
        )}
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">
            {language === 'de' ? 'Letzte Aktivität' : 'Recent Activity'}
          </h2>
          <div className="space-y-3">
            {recentActivity.map((act) => (
              <Link
                key={act.key}
                href={`/watch/${act.slug}/${act.season}/${act.episode}`}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 focus-visible:bg-gray-800 transition-colors"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {act.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <p className="text-gray-400 text-xs">
                    S{act.season} E{act.episode}
                  </p>
                </div>
                <span className="text-gray-500 text-xs">
                  {formatTime(act.time)} / {formatTime(act.duration)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
