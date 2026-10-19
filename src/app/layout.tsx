import type { Metadata } from "next";
import { Roboto, Dancing_Script } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

// Handwritten accent used for taglines (the "Quality first, trend second." line).
const script = Dancing_Script({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-script-face",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://dasdum.co.uk"),
  title: {
    default: "DASDUM — Designed with purpose. Made for today.",
    template: "%s | DASDUM",
  },
  description:
    "DASDUM is a modern African brand crafting thoughtful, quality-first goods for everyday living.",
  openGraph: {
    type: "website",
    siteName: "DASDUM",
  },
  twitter: { card: "summary_large_image" },
  verification: {
    // Google Search Console domain verification — generates the correct
    // <meta name="google-site-verification" content="..."> tag automatically.
    google: "gLFpVj7jfeGz8FOtoI3zf34ku43DUBBeBjpKUwwhK4o",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${script.variable}`}>
      <body>{children}</body>
    </html>
  );
}
