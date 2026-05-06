import type { Metadata, Viewport } from "next";
import { QueryProvider } from "@/components/query-provider";
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
  category: "fitness",
  keywords: [
    "gym management software",
    "India gym OS",
    "membership management",
    "QR gym check-in",
    "fitness club operations",
  ],
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
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Zook",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zook - Gym OS",
    description: "India-first operating system for gyms, members, trainers, and front desks.",
    images: ["/icons/icon-512.png"],
  },
  icons: {
    icon: "/icons/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Zook",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#070908",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
