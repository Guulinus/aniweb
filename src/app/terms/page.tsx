'use client';

import InfoPage from '@/components/InfoPage';
import { useLanguage } from '@/hooks/useLanguage';

export default function TermsPage() {
  const { language } = useLanguage();

  if (language === 'de') {
    return (
      <InfoPage title="Nutzungsbedingungen">
        <p>AniRoll hostet selbst keine Videodateien. Alle Streams werden von Drittanbietern bereitgestellt und lediglich verlinkt bzw. eingebettet.</p>
        <h2>Nutzung auf eigene Verantwortung</h2>
        <p>Die Verfügbarkeit einzelner Streams hängt von diesen Drittanbietern ab und kann sich jederzeit ändern. AniRoll übernimmt keine Gewähr für Verfügbarkeit, Qualität oder Rechtmäßigkeit der verlinkten Inhalte in deinem Land.</p>
        <h2>Keine Garantie</h2>
        <p>Der Dienst wird "wie besehen" bereitgestellt, ohne jegliche Garantie. Es handelt sich um ein privates, nicht-kommerzielles Projekt.</p>
      </InfoPage>
    );
  }

  return (
    <InfoPage title="Terms of Use">
      <p>AniRoll does not host any video files itself. All streams are provided by third parties and are only linked or embedded.</p>
      <h2>Use at Your Own Risk</h2>
      <p>Availability of individual streams depends on those third parties and can change at any time. AniRoll makes no guarantee about the availability, quality, or legality of linked content in your country.</p>
      <h2>No Warranty</h2>
      <p>The service is provided "as is", without any warranty. This is a private, non-commercial project.</p>
    </InfoPage>
  );
}
