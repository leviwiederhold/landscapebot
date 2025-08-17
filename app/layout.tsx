import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LandscapeBot — Instant Landscaping Estimates",
  description:
    "Swiss Army Knife for landscapers: mowing, mulch, sod, gravel & more. Get a ballpark estimate in seconds; book a site visit for a firm quote.",
  metadataBase: new URL("https://landscapebot-eight.vercel.app"),
  alternates: {
    canonical: "https://landscapebot-eight.vercel.app",
  },
  openGraph: {
    title: "LandscapeBot — Instant Landscaping Estimates",
    description:
      "Mowing, mulch, sod, gravel & more. Fast, no-nonsense estimates you can send to clients.",
    url: "https://landscapebot-eight.vercel.app",
    siteName: "LandscapeBot",
    type: "website",
    images: [
      {
        url: "/og.jpg", // create /public/og.jpg (1200x630)
        width: 1200,
        height: 630,
        alt: "LandscapeBot — Instant Landscaping Estimates",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LandscapeBot — Instant Landscaping Estimates",
    description:
      "Swiss Army Knife for landscapers: mowing, mulch, sod, gravel & more.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  category: "business",
  keywords: [
    "landscaping estimator",
    "mulch calculator",
    "sod cost calculator",
    "mowing pricing tool",
    "gravel calculator",
    "landscape quotes",
  ],
};

export const viewport: Viewport = {
  themeColor: "#10b981", // green accent
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-900 text-neutral-100`}
      >
        {children}
      </body>
    </html>
  );
}
