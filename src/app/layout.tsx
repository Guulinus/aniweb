import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/hooks/useLanguage";
import TVNavigationWrapper from "@/hooks/useTVNavigation";
import { AuthProvider } from "@/lib/AuthContext";
import { SettingsProvider } from "@/lib/SettingsContext";
import { AuthGate } from "@/lib/AuthGate";
import { ToastProvider } from "@/lib/ToastContext";

export const metadata: Metadata = {
  title: "AniRoll - Anime mit deutscher Synchronisation kostenlos streamen",
  description: "Kostenlos Anime mit deutscher Synchronisation streamen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="antialiased">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var s=JSON.parse(localStorage.getItem('anirollSettings'));if(s&&s.theme){var t=s.theme;document.documentElement.setAttribute('data-theme',t.theme);if(t.theme==='custom'&&t.customColor){var c=t.customColor;document.documentElement.style.setProperty('--custom-primary',c);var r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);function h(h){return'#'+[r,g,b].map(function(v){return Math.max(0,Math.min(255,v+h)).toString(16).padStart(2,'0')}).join('')}document.documentElement.style.setProperty('--custom-primary-hover',h(-20));document.documentElement.style.setProperty('--custom-primary-soft','rgba('+r+','+g+','+b+',0.2)');document.documentElement.style.setProperty('--custom-primary-border','rgba('+r+','+g+','+b+',0.3)');document.documentElement.style.setProperty('--custom-primary-shadow','rgba('+r+','+g+','+b+',0.25)')}}catch(e){}})();`
        }} />
      </head>
      <body className="bg-gray-950 text-white flex flex-col min-h-screen">
        <ErrorBoundary>
          <SettingsProvider>
          <AuthProvider>
            <LanguageProvider>
            <TVNavigationWrapper>
              <ToastProvider>
              <AuthGate>
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </AuthGate>
              </ToastProvider>
            </TVNavigationWrapper>
          </LanguageProvider>
          </AuthProvider>
          </SettingsProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}