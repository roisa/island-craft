import { defineConfig } from 'vite';

// base './' so the built game works from any folder,
// e.g. dropped into babymo-app/www/island-craft/ or wrapped by Capacitor.
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
});
