import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Space_Grotesk, Syne, JetBrains_Mono } from "next/font/google";
import { Providers } from "../providers/Providers";
import "../styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

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
      </head>
      <body className={`${spaceGrotesk.variable} ${syne.variable} ${jetBrainsMono.variable}`}>
        <Providers>{children}</Providers>
        <Script id="sw-register" strategy="afterInteractive">
          {`if("serviceWorker" in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js")})}`}
        </Script>
      </body>
    </html>
  );
}
