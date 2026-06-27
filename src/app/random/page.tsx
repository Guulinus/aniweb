import { redirect } from 'next/navigation';

const ANILIST_API = 'https://graphql.anilist.co';

const query = `
  query ($page: Int) {
    Page(page: $page, perPage: 1) {
      media(type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
        id
        title { romaji english }
      }
    }
  }
`;

export const dynamic = 'force-dynamic';

export default async function RandomPage() {
  const totalPages = 50;
  const page = Math.floor(Math.random() * totalPages) + 1;

  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { page } }),
      cache: 'no-store',
    });
    const data = await res.json();
    const media = data.data?.Page?.media?.[0];
    if (media) {
      const title = media.title.english ?? media.title.romaji;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      redirect(`/anime/${slug}?id=${media.id}`);
    }
  } catch {}

  redirect('/browse');
}
