import type { MetadataRoute } from "next";

// App Router convention file — Next.js automatically serves this at
// /manifest.webmanifest and links it from <head>, no metadata config
// needed. Icon source: the same "$" mark (public/ai-mark.png) used next to
// "AI Insights" throughout the app, re-rendered from its original
// HTML/CSS source at high resolution (not upscaled from the small existing
// asset) so the 512x512 icon stays crisp on home screens.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Steward",
    short_name: "Steward",
    description: "A personal budgeting app",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f6f1e4",
    theme_color: "#f6f1e4",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
