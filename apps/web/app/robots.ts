import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "https://app.zook.kyokasuigetsu.xyz";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/gyms", "/g/"],
      disallow: ["/api/", "/dashboard", "/platform", "/checkout"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
