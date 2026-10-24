/**
 * app.config.js — reads EAS secrets / local env vars at build time.
 *
 * EAS secrets to set before building:
 *   eas secret:create --scope project --name WIALON_TOKEN   --value "<real token>"
 *   eas secret:create --scope project --name LICENSE_SECRET --value "<random 32-char string>"
 *
 * For local dev without secrets, the app runs in demo mode (mock data, unlocked).
 */

export default {
  expo: {
    name: 'Fleet Tracker',
    slug: 'fleet-tracker-',
    owner: 'drexonyx.studio',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0a0a0c',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.drexonyx.fleettracker',
      ...(process.env.GOOGLE_MAPS_IOS_KEY ? {
        config: { googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY },
      } : {}),
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0a0a0c',
      },
      package: 'com.drexonyx.fleettracker',
      ...(process.env.GOOGLE_MAPS_ANDROID_KEY ? {
        config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY } },
      } : {}),
    },
    web: { bundler: 'metro', favicon: './assets/favicon.png' },
    plugins: [
      'expo-router',
      'expo-secure-store',
    ],
    scheme: 'fleet-tracker',
    extra: {
      // Injected at EAS build time via secrets — empty string = demo/dev mode
      wialonToken: process.env.WIALON_TOKEN ?? '',
      licenseSecret: process.env.LICENSE_SECRET ?? 'dev-mode-no-secret',
      mapboxToken: process.env.MAPBOX_TOKEN ?? '',
      eas: { projectId: process.env.EAS_PROJECT_ID ?? '49194fb7-a5e6-4997-aaca-daed56a10215' },
    },
  },
};
