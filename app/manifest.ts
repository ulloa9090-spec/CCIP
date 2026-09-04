import type { MetadataRoute } from "next";

/**
 * blueprint §C "PWA installable shell + partial offline read" (Phase 12).
 * Next.js's file convention auto-serves this at /manifest.webmanifest and
 * links it from every page's <head> — no manual wiring needed.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas OS — Personal Operating System",
    short_name: "Atlas OS",
    description: "A personal execution operating system connecting Vision to Daily Action.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0b0d",
    theme_color: "#3d63dd",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
