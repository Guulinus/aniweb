import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/hooks/useLanguage";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AniRoll - Anime mit deutscher Synchronisation kostenlos streamen",
  description: "Kostenlos Anime mit deutscher Synchronisation streamen - AniRoll bietet eine große Auswahl an Anime-Serien und Filmen in HD-Qualität.",
  keywords: ["Anime streamen", "Anime kostenlos", "deutsche Synchronisation", "AniRoll", "Anime HD"],
  authors: [{ name: "AniRoll" }],
  openGraph: {
    title: "AniRoll - Anime mit deutscher Synchronisation kostenlos streamen",
    description: "Kostenlos Anime mit deutscher Synchronisation streamen",
    type: "website",
    locale: "de_DE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-gray-950 text-white flex flex-col min-h-screen">
        <ErrorBoundary>
          <LanguageProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
