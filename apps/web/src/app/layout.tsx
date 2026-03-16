import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Providers } from "../providers/Providers";
import "../styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lexis.app"),
  title: {
    default: "Lexis — The Infinite Word Puzzle Arena",
    template: "%s | Lexis"
  },
  description:
    "A competitive word puzzle platform where speed, strategy, and vocabulary determine who rises to the top.",
  keywords: [
    "wordle", "word puzzle", "competitive", "leaderboard",
    "vocabulary", "pattern recognition", "brain training", "lexis"
  ],
  authors: [{ name: "Lexis" }],
  creator: "Lexis",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Lexis",
    title: "Lexis — The Infinite Word Puzzle Arena",
    description: "Think Faster. Guess Smarter. Rise Higher."
  },
  twitter: {
    card: "summary_large_image",
    title: "Lexis — The Infinite Word Puzzle Arena",
    description: "Think Faster. Guess Smarter. Rise Higher."
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#060606",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
