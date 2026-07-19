import type { MetadataRoute } from "next";
import { docs } from "../lib/docs";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-20T00:00:00Z");
  return [
    { url: "https://tcalc-one.vercel.app/", lastModified, changeFrequency: "monthly", priority: 1 },
    { url: "https://tcalc-one.vercel.app/docs/", lastModified, changeFrequency: "monthly", priority: 0.9 },
    ...docs.map(({ slug }) => ({ url: `https://tcalc-one.vercel.app/docs/${slug}/`, lastModified, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
