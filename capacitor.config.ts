import type { CapacitorConfig } from '@capacitor/cli';

// The iOS app wraps the same game that runs on the web (`npm run build` → dist/).
// Change appId to your own reverse-domain id before publishing (it must match the
// Bundle Identifier you register in your Apple Developer account).
const config: CapacitorConfig = {
  appId: 'com.babymo.islandcraft',
  appName: 'BabyMo Craft',
  webDir: 'dist',
  ios: {
    contentInset: 'never',          // the game draws edge to edge; it keeps clear of the notch itself (safe-area CSS)
    backgroundColor: '#8fd3ec',     // sky blue while it loads
    allowsLinkPreview: false,
    scrollEnabled: false,
  },
};

export default config;
