import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Use relative paths so it works under project path and custom domain
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
      },
      manifest: {
        name: "Apex Gerustbau Admin",
        short_name: "Apex Admin",
        description: "Admin panel per menaxhimin e projekteve, financave dhe ekipeve.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        scope: "./",
        start_url: "./#/admin/login",
        icons: [
          {
            src: "./pwa-192-custom.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "./pwa-512-custom.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "./pwa-maskable-custom.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
