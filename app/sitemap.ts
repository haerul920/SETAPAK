import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://setapak.budayago.id";
  const now = new Date();
  return [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/kredit`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/tentang`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
