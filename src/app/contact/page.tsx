'use client';

import Link from 'next/link';
import InfoPage from '@/components/InfoPage';
import { useLanguage } from '@/hooks/useLanguage';

export default function ContactPage() {
  const { language } = useLanguage();

  if (language === 'de') {
    return (
      <InfoPage title="Kontakt">
        <p>AniRoll ist ein privates Ein-Personen-Hobbyprojekt ohne dedizierten Support-Kanal.</p>
        <p>Für konkrete Probleme (z.B. ein Stream funktioniert nicht) schau zuerst bei <Link href="/report">Problem melden</Link> oder den <Link href="/faq">FAQ</Link> vorbei — dort sind die häufigsten Fälle abgedeckt.</p>
      </InfoPage>
    );
  }

  return (
    <InfoPage title="Contact">
      <p>AniRoll is a private, one-person hobby project with no dedicated support channel.</p>
      <p>For specific issues (e.g. a stream not working), check <Link href="/report">Report an Issue</Link> or the <Link href="/faq">FAQ</Link> first — the most common cases are covered there.</p>
    </InfoPage>
  );
}
