import type { Metadata } from 'next';
import { getAnimeById } from '@/lib/anilist';
import WatchClient from './WatchClient';

export async function generateMetadata(
  {
    params,
    searchParams,
  }: {
    params: { animeSlug: string; season: string; episode: string };
    searchParams: { id?: string; title?: string };
  }
): Promise<Metadata> {
  const id = parseInt(searchParams.id ?? '0');
  const episodeLabel = params.season === '0'
    ? (searchParams.title || 'Film')
    : `Staffel ${params.season} · Episode ${params.episode}`;

  if (!id) {
    return { title: episodeLabel };
  }

  try {
    const anime = await getAnimeById(id);
    if (!anime) return { title: episodeLabel };

    const animeTitle = anime.title.english ?? anime.title.romaji;
    const title = `${animeTitle} - ${episodeLabel}`;
    const description = `${animeTitle} ${episodeLabel} kostenlos mit deutscher Synchronisation auf AniRoll streamen.`;
    const image = anime.coverImage.large || anime.coverImage.medium;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: image ? [{ url: image }] : undefined,
        type: 'video.episode',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { title: episodeLabel };
  }
}

export default function WatchPage({ params }: { params: { animeSlug: string; season: string; episode: string } }) {
  return <WatchClient params={params} />;
}
