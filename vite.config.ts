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
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,txt}"],
        // Install-only data: fetched once while online, then it lives in IndexedDB.
        globIgnores: ["**/expanded-cards-*.js", "**/retired-retrieval-hashes-*.js"],
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
  build: {
    rolldownOptions: {
      output: {
        // Stable vendor chunks survive app deploys in the browser cache.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/ },
            { name: "supabase", test: /node_modules[\\/]@supabase[\\/]/ },
            { name: "dexie", test: /node_modules[\\/]dexie(-react-hooks)?[\\/]/ },
            { name: "markdown", test: /node_modules[\\/](react-markdown|remark-gfm)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    // happy-dom loads in seconds; jsdom took 30-100 s to load on Windows and tripped
    // Vitest's fixed 60 s worker-start timeout.
    environment: "happy-dom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // A forked child starts faster than a worker_thread on this host.
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
    // One shared module registry: files must mock with vi.spyOn on the module
    // namespace, because a vi.mock factory cannot replace an already-imported module.
    isolate: false,
  },
});
