import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL ?? "https://app.zook.kyokasuigetsu.xyz"),
  title: {
    default: "Zook - Gym OS",
    template: "%s | Zook",
  },
  description: "India-first operating system for gyms, members, trainers, and front desks.",
  applicationName: "Zook",
  authors: [{ name: "Zook" }],
  creator: "Zook",
  publisher: "Zook",
  alternates: {
    canonical: "/",
    languages: {
      "en-IN": "/",
    },
  },
  openGraph: {
    title: "Zook - Gym OS",
    description: "India-first operating system for gyms, members, trainers, and front desks.",
    url: "/",
    siteName: "Zook",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zook - Gym OS",
    description: "India-first operating system for gyms, members, trainers, and front desks.",
  },
  icons: {
    icon: "/icons/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#070908",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
