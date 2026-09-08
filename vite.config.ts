import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/maskable-512.png",
      ],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,txt}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
            options: {
              cacheName: "supabase-network-only",
            },
          },
        ],
      },
      manifest: {
        name: "Recall — Engineering practice",
        short_name: "Recall",
        description:
          "Practical software engineering flashcards, hands-on missions, and an offline evidence journal.",
        display: "standalone",
        start_url: "/",
        scope: "/",
        theme_color: "#24735d",
        background_color: "#f8f9f6",
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
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        share_target: {
          action: "/capture",
          method: "GET",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
      },
    }),
  ],
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
    isolate: false,
  },
});
