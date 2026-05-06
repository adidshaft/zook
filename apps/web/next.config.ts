import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: ws: wss:",
  "frame-src 'self' https:",
  "object-src 'none'"
].join("; ");

const nextConfig: NextConfig = {
  transpilePackages: ["@zook/core", "@zook/ui", "@zook/db"],
  output: "standalone",
  typedRoutes: false,
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), geolocation=(self), microphone=(), payment=(), browsing-topics=()"
          }
        ]
      }
    ];
  }
};

export default createNextIntlPlugin("./i18n/request.ts")(nextConfig);
