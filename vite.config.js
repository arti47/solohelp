import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// REPO must match your GitHub repository name exactly.
// User/org site (username.github.io) -> set REPO = "".
const REPO = "solohelp";

export default defineConfig({
  base: REPO ? `/${REPO}/` : "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png", "icon-maskable-512.png"],
      manifest: {
        name: "Solo Session Runner",
        short_name: "Runner",
        description: "OPEN / RUN / LAND protocol for solo tabletop RPG sessions.",
        start_url: REPO ? `/${REPO}/` : "/",
        scope: REPO ? `/${REPO}/` : "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0c0a09",
        theme_color: "#0c0a09",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: REPO ? `/${REPO}/index.html` : "/index.html"
      }
    })
  ]
});
