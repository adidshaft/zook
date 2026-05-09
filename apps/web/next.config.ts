import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  transpilePackages: ["@zook/core", "@zook/ui", "@zook/db"],
  output: "standalone",
  typedRoutes: false,
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    localPatterns: [{ pathname: "/**" }],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      // Add your CDN or custom storage domain here if needed
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), geolocation=(self), microphone=(), payment=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
const sentryProject = process.env.SENTRY_WEB_PROJECT?.trim() || process.env.SENTRY_PROJECT?.trim();
const sentryBuildOptions = {
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(sentryProject ? { project: sentryProject } : {}),
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    autoInstrumentAppDirectory: false,
    autoInstrumentMiddleware: false,
    autoInstrumentServerFunctions: false,
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

const configuredNextConfig = withBundleAnalyzer(withNextIntl(nextConfig));

export default process.env.ERROR_REPORTER === "sentry"
  ? withSentryConfig(configuredNextConfig, sentryBuildOptions)
  : configuredNextConfig;
