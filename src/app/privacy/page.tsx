'use client';

import InfoPage from '@/components/InfoPage';
import { useLanguage } from '@/hooks/useLanguage';

export default function PrivacyPage() {
  const { language } = useLanguage();

  if (language === 'de') {
    return (
      <InfoPage title="Datenschutz">
        <p>AniRoll ist ein privates Hobbyprojekt. Es gibt kein Tracking, keine Werbenetzwerke und keinen Verkauf von Daten an Dritte.</p>
        <h2>Konto & Login</h2>
        <p>Ein Konto ist optional und wird nur benötigt, um Merkliste und Fortschritt geräteübergreifend zu synchronisieren. Gespeichert werden Benutzername, ein gehashtes Passwort sowie deine Merkliste und Watch-Fortschritte.</p>
        <h2>Lokale Daten</h2>
        <p>Theme-Einstellungen, Sprache und (ohne Konto) deine Merkliste und dein Verlauf werden ausschließlich lokal in deinem Browser (localStorage) gespeichert und verlassen dein Gerät nicht.</p>
        <h2>Drittanbieter-Inhalte</h2>
        <p>Video-Streams werden von externen Anbietern eingebettet bzw. direkt verlinkt. Diese Anbieter können eigene Cookies setzen, sobald ein Stream geladen wird — das liegt außerhalb der Kontrolle von AniRoll.</p>
      </InfoPage>
    );
  }

  return (
    <InfoPage title="Privacy">
      <p>AniRoll is a private hobby project. There is no tracking, no ad networks, and no data is sold to third parties.</p>
      <h2>Account & Login</h2>
      <p>An account is optional and only used to sync your watchlist and progress across devices. It stores your username, a hashed password, and your watchlist/progress data.</p>
      <h2>Local Data</h2>
      <p>Theme settings, language, and (without an account) your watchlist and history are stored only in your browser's localStorage and never leave your device.</p>
      <h2>Third-Party Content</h2>
      <p>Video streams are embedded or linked from external providers. Those providers may set their own cookies once a stream loads — that's outside AniRoll's control.</p>
    </InfoPage>
  );
}
