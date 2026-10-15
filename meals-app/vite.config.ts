import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_', 'GEMINI_'],
  server: {
    proxy: {
      '/api/openfoodfacts': {
        target: 'https://es.openfoodfacts.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openfoodfacts/, ''),
        headers: {
          'User-Agent': 'NutriPlanMealsApp/1.0 (Web; contact@mealsapp.local)',
        },
      },
    },
  },
});
