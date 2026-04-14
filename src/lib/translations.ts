export type Language = 'de' | 'en';

const translations = {
  de: {
    // Navbar
    home: 'Startseite',
    browse: 'Durchsuchen',
    search: 'Suchen...',
    watchlist: 'Merkliste',
    settings: 'Einstellungen',
    language: 'Sprache',
    german: 'Deutsch',
    english: 'Englisch',

    // Homepage
    continueWatching: 'weiterschauen',
    trending: 'Beliebt',
    popular: 'Beliebt',

    // Detail page
    episodes: 'Episoden',
    checkingAvailability: '(Verfügbarkeit wird geprüft...)',
    loadingEpisodes: 'Episoden werden geladen...',
    noGermanDub: 'Keine deutsche Synchronisation verfügbar',
    notAvailableOnAniworld: 'Dieses Anime ist nicht auf Aniworld.to verfügbar',

    // Watchlist button
    planToWatch: 'Später ansehen',
    watching: 'Anschauen',
    completed: 'Abgeschlossen',
    rewatching: 'Erneut anschauen',
    addToWatchlist: 'Zur Merkliste',
    inWatchlist: 'In Merkliste',
    watchNow: 'Jetzt ansehen',

    // Video player
    changeServer: 'Server ändern',
    noStream: 'Stream nicht verfügbar',
    germanDub: 'Deutsche Synchronisation',
    germanSub: 'Deutsche Untertitel',
    ads: 'Werbung',

    // Continue watching
    season: 'Staffel',
    episode: 'Episode',

    // Show more/less
    showMore: 'Mehr anzeigen',
    showLess: 'Weniger anzeigen',

    // Browse
    browseTitle: 'Durchsuchen',
    all: 'Alle',
    airing: 'Laufend',
    finished: 'Abgeschlossen',
    upcoming: 'Angekündigt',

    // Errors
    animeNotFound: 'Anime nicht gefunden',
    loadingError: 'Fehler beim Laden',
    noResults: 'Keine Ergebnisse',

    // Footer
    footer1: 'Alle Anime werden von Drittanbietern gehostet. Wir übernehmen keine Verantwortung für die Inhalte.',
    footer2: 'Dieses Projekt ist für Bildungszwecke.',
  },
  en: {
    // Navbar
    home: 'Home',
    browse: 'Browse',
    search: 'Search...',
    watchlist: 'Watchlist',
    settings: 'Settings',
    language: 'Language',
    german: 'German',
    english: 'English',

    // Homepage
    continueWatching: 'Continue Watching',
    trending: 'Trending',
    popular: 'Popular',

    // Detail page
    episodes: 'Episodes',
    checkingAvailability: '(checking availability...)',
    loadingEpisodes: 'Loading episodes...',
    noGermanDub: 'No German dub available',
    notAvailableOnAniworld: 'This anime is not available on Aniworld.to',

    // Watchlist button
    planToWatch: 'Plan to Watch',
    watching: 'Watching',
    completed: 'Completed',
    rewatching: 'Rewatching',
    addToWatchlist: 'Add to Watchlist',
    inWatchlist: 'In Watchlist',
    watchNow: 'Watch Now',

    // Video player
    changeServer: 'Change Server',
    noStream: 'Stream not available',
    germanDub: 'German Dub',
    germanSub: 'German Sub',
    ads: 'Ads',

    // Continue watching
    season: 'Season',
    episode: 'Episode',

    // Show more/less
    showMore: 'Show more',
    showLess: 'Show less',

    // Browse
    browseTitle: 'Browse',
    all: 'All',
    airing: 'Airing',
    finished: 'Finished',
    upcoming: 'Upcoming',

    // Errors
    animeNotFound: 'Anime not found',
    loadingError: 'Error loading',
    noResults: 'No results',

    // Footer
    footer1: 'All anime is hosted by third parties. We are not responsible for any content.',
    footer2: 'This project is for educational purposes.',
  },
};

export type TranslationKey = keyof typeof translations.de;

export function t(key: TranslationKey, lang: Language = 'de'): string {
  return translations[lang][key] || translations.de[key] || key;
}

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'de';
  const stored = localStorage.getItem('language');
  return stored === 'en' || stored === 'de' ? stored : 'de';
}

export function setStoredLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('language', lang);
}