import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { QueryProvider } from "@/components/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL ?? "https://zookfit.in"),
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
  themeColor: "#f7f8f4",
  colorScheme: "light dark",
};

type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

function normalizeThemePreference(value: string | undefined): ThemePreference {
  return value === "system" || value === "light" || value === "dark" ? value : "system";
}

function initialServerTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "dark" ? "dark" : "light";
}

const themeBootstrapScript = `
(function() {
  try {
    var match = document.cookie.match(/(?:^|; )zook_theme=([^;]+)/);
    var preference = match ? decodeURIComponent(match[1]) : "system";
    var theme = preference === "dark" || preference === "light"
      ? preference
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const themePreference = normalizeThemePreference(cookieStore.get("zook_theme")?.value);
  const theme = initialServerTheme(themePreference);
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  return (
    <html lang="en-IN" data-theme={theme} style={{ colorScheme: theme }} suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: themeBootstrapScript,
          }}
        />
      </head>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
