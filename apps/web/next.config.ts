import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@zook/core", "@zook/ui", "@zook/db"],
  experimental: {
    typedRoutes: false
  }
};

export default nextConfig;
