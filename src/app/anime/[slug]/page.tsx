import type { Metadata } from 'next';
import { getAnimeById } from '@/lib/anilist';
import AnimeDetailClient from './AnimeDetailClient';

export async function generateMetadata(
  { params, searchParams }: { params: { slug: string }; searchParams: { id?: string } }
): Promise<Metadata> {
  const id = parseInt(searchParams.id ?? '0');
  if (!id) return {};

  try {
    const anime = await getAnimeById(id);
    if (!anime) return {};

    const title = anime.title.english ?? anime.title.romaji;
    const description = anime.description
      ? anime.description.replace(/<[^>]+>/g, '').slice(0, 200)
      : `${title} kostenlos mit deutscher Synchronisation streamen auf AniRoll.`;
    const image = anime.coverImage.large || anime.coverImage.medium;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: image ? [{ url: image }] : undefined,
        type: 'video.tv_show',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default function AnimeDetailPage({ params }: { params: { slug: string } }) {
  return <AnimeDetailClient params={params} />;
}
