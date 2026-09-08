import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    ssr: 'scripts/check-quality-runtime.ts',
    outDir: 'artifacts/quality-check',
    emptyOutDir: true,
    minify: false,
    rolldownOptions: { output: { entryFileNames: 'check.mjs' } },
  },
});
