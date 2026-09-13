'use client';

import InfoPage from '@/components/InfoPage';
import { useLanguage } from '@/hooks/useLanguage';

export default function HelpPage() {
  const { language } = useLanguage();

  if (language === 'de') {
    return (
      <InfoPage title="Hilfe">
        <h2>Suchen</h2>
        <p>Die Suche oben in der Navigation durchsucht je nach Bereich entweder Anime oder Filme — welcher Bereich aktiv ist, siehst du an der Navigation.</p>
        <h2>Merkliste & Verlauf</h2>
        <p>Über das Lesezeichen-Symbol auf einer Detailseite fügst du einen Titel zur Merkliste hinzu. Dein Fortschritt wird automatisch gespeichert, sodass du dort weitermachen kannst, wo du aufgehört hast.</p>
        <h2>Stream startet nicht</h2>
        <p>Wechsle im Player zu einem anderen Server/Hoster — die Liste zeigt mehrere Quellen. Manche Anbieter sind zeitweise nicht erreichbar; ein anderer funktioniert meist trotzdem.</p>
        <h2>Sprache & Theme ändern</h2>
        <p>Unter „Einstellungen" lassen sich Sprache und Farbthema anpassen.</p>
      </InfoPage>
    );
  }

  return (
    <InfoPage title="Help">
      <h2>Search</h2>
      <p>The search bar in the navigation searches either anime or movies depending on which section you're in — check the navigation to see which is active.</p>
      <h2>Watchlist & History</h2>
      <p>Use the bookmark icon on a detail page to add a title to your watchlist. Your progress is saved automatically so you can continue where you left off.</p>
      <h2>Stream won't start</h2>
      <p>Switch to a different server/hoster in the player — the list shows multiple sources. Some providers are occasionally unreachable; another one usually still works.</p>
      <h2>Changing language & theme</h2>
      <p>Language and color theme can be adjusted under "Settings".</p>
    </InfoPage>
  );
}
