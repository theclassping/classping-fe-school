import type { MetadataRoute } from "next";

// Home-screen install details. Android uses these icons when a user adds the
// portal to the home screen; iPhone uses app/apple-icon.png instead.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClassPing Sekolah",
    short_name: "ClassPing",
    description: "Portal sekolah untuk staf dan guru ClassPing.",
    start_url: "/",
    display: "browser",
    background_color: "#1FA78A",
    theme_color: "#1FA78A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // The bubble sits inside the central safe zone, so Android can crop the
      // same artwork into its circle or squircle mask.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
