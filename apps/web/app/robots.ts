import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "https://zookfit.in";
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const isStaffHost =
    host === "dashboard.zookfit.in" ||
    host === "dashboard.localhost" ||
    host.startsWith("dashboard.");
  if (isStaffHost) {
    return {
      rules: {
        userAgent: "*",
        disallow: ["/"],
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/gyms", "/g/"],
      disallow: ["/api/", "/dashboard", "/platform", "/checkout", "/m/", "/me"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
