import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works from any folder or sub-path.
  base: './',
  server: {
    open: true,
    host: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
