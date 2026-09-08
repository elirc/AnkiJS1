import {defineConfig} from 'vite';
export default defineConfig({build:{ssr:'scripts/check-retrieval-runtime.ts',outDir:'artifacts/retrieval-check-build',emptyOutDir:false,minify:false,rolldownOptions:{output:{entryFileNames:'checks.mjs'}}}});
