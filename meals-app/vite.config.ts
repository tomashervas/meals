import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "maskable-icon-512x512.png"
      ],
      manifest: {
        name: "NutriPlan AI - Planificador de Comidas y Macros",
        short_name: "NutriPlan AI",
        description: "Planificador de comidas, cálculo de macros y balance calórico inteligente impulsado por IA",
        theme_color: "#059669",
        background_color: "#f8fafc",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"]
      }
    }),
  ],
  envPrefix: ["VITE_", "GEMINI_"],
  server: {
    proxy: {
      "/api/openfoodfacts": {
        target: "https://es.openfoodfacts.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openfoodfacts/, ""),
        headers: {
          "User-Agent": "NutriPlanMealsApp/1.0 (Web; contact@mealsapp.local)",
        },
      },
    },
  },
});
