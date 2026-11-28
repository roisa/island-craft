import { defineConfig } from 'vite';

// base './' so the built game works from any folder,
// e.g. dropped into babymo-app/www/island-craft/ or wrapped by Capacitor.
// three.js gets its own file: it rarely changes, so after an update the browser keeps it and only downloads
// the (smaller) game file again.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 950,
    rollupOptions: { output: { manualChunks: id => (id.includes('node_modules/three/') ? 'three' : undefined) } },
  },
});
