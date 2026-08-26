// Personalized page reading localStorage client-side — force dynamic rendering so
// the server never returns a statically cached shell (Next applies its own long-lived
// s-maxage header to static pages regardless of headers() config) and stale HTML/JS
// can't keep serving an old version of this page to returning visitors after a deploy.
export const dynamic = 'force-dynamic';

import WatchlistClient from './WatchlistClient';

export default function WatchlistPage() {
  return <WatchlistClient />;
}
