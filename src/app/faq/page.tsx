'use client';

import InfoPage from '@/components/InfoPage';
import { useLanguage } from '@/hooks/useLanguage';

const FAQ_DE = [
  { q: 'Ist AniRoll kostenlos?', a: 'Ja, komplett kostenlos, ohne Werbung und ohne Abo.' },
  { q: 'Brauche ich ein Konto?', a: 'Nein. Ohne Konto funktionieren Merkliste und Verlauf lokal in deinem Browser. Ein Konto lohnt sich nur, wenn du geräteübergreifend synchronisieren willst.' },
  { q: 'Warum lädt ein Stream nicht?', a: 'Die Streams kommen von externen Anbietern, die gelegentlich down sind oder Links entfernen. Probiere im Player einen anderen Server/Hoster aus der Liste — meist gibt es mehrere Optionen.' },
  { q: 'Warum sieht ein Film-Cover manchmal anders aus als erwartet?', a: 'Cover werden automatisch von TMDB anhand des Titels zugeordnet. Bei sehr ähnlichen oder mehrdeutigen Titeln kann das gelegentlich daneben liegen.' },
  { q: 'Auf welchen Geräten funktioniert AniRoll?', a: 'Auf jedem Gerät mit modernem Browser — Desktop, Handy, Tablet.' },
];

const FAQ_EN = [
  { q: 'Is AniRoll free?', a: 'Yes, completely free, no ads, no subscription.' },
  { q: 'Do I need an account?', a: 'No. Without an account, your watchlist and history work locally in your browser. An account is only useful if you want to sync across devices.' },
  { q: 'Why won\'t a stream load?', a: 'Streams come from external providers that occasionally go down or remove links. Try a different server/hoster from the list in the player — there are usually several options.' },
  { q: 'Why does a movie cover sometimes look wrong?', a: 'Covers are matched automatically via TMDB based on the title. For very similar or ambiguous titles, this can occasionally pick the wrong one.' },
  { q: 'What devices does AniRoll work on?', a: 'Any device with a modern browser — desktop, phone, tablet.' },
];

export default function FaqPage() {
  const { language } = useLanguage();
  const items = language === 'de' ? FAQ_DE : FAQ_EN;

  return (
    <InfoPage title="FAQ">
      {items.map((item, i) => (
        <div key={i}>
          <h2>{item.q}</h2>
          <p>{item.a}</p>
        </div>
      ))}
    </InfoPage>
  );
}
