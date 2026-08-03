import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/checkout", "/account", "/admin", "/api/"],
    },
    sitemap: "https://campusmode.in/sitemap.xml",
    host: "https://campusmode.in",
  };
}
