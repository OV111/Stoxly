import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://stoxly.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/ai",
        "/alerts",
        "/billing",
        "/crypto",
        "/intelligence",
        "/journal",
        "/news",
        "/profile",
        "/search",
        "/settings",
        "/stock",
        "/watchlist",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
        "/api",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
