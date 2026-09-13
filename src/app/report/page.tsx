'use client';

import InfoPage from '@/components/InfoPage';
import { useLanguage } from '@/hooks/useLanguage';

export default function ReportPage() {
  const { language } = useLanguage();

  if (language === 'de') {
    return (
      <InfoPage title="Problem melden">
        <p>AniRoll ist ein privates Projekt ohne Support-Team — die meisten Probleme lassen sich aber selbst lösen:</p>
        <h2>Stream funktioniert nicht</h2>
        <p>Probiere im Player einen anderen Server/Hoster aus der angezeigten Liste. Die Streams kommen von externen Anbietern, die einzeln mal ausfallen können.</p>
        <h2>Falsches Cover oder falsche Beschreibung</h2>
        <p>Das passiert gelegentlich bei mehrdeutigen Titeln, da Cover automatisch zugeordnet werden. Lädt beim nächsten Besuch meist korrekt, sobald die Zuordnung aktualisiert wird.</p>
        <h2>Etwas anderes ist kaputt</h2>
        <p>Da es aktuell keinen dedizierten Kontaktkanal gibt, hilft am meisten: kurz warten und es später erneut versuchen — viele Probleme liegen an den externen Quellen, nicht an AniRoll selbst.</p>
      </InfoPage>
    );
  }

  return (
    <InfoPage title="Report an Issue">
      <p>AniRoll is a private project with no support team — but most issues can be resolved yourself:</p>
      <h2>A stream doesn't work</h2>
      <p>Try a different server/hoster from the list shown in the player. Streams come from external providers that can individually go down.</p>
      <h2>Wrong cover or description</h2>
      <p>This occasionally happens for ambiguous titles since covers are matched automatically. It usually resolves itself on a later visit once the match updates.</p>
      <h2>Something else is broken</h2>
      <p>Since there's no dedicated contact channel right now, the best bet is: wait a bit and try again — many issues come from the external sources, not AniRoll itself.</p>
    </InfoPage>
  );
}
