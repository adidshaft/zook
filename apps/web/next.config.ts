import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@zook/core", "@zook/ui", "@zook/db"],
  typedRoutes: false,
  allowedDevOrigins: ["127.0.0.1"]
};

export default nextConfig;
