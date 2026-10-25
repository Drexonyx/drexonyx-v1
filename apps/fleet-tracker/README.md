# Fleet Tracker — Mobile App

React Native mobile app for fleet management via Wialon API.  
Built by **MDA / DREXONYX**.

## Features

- **Live Map** — all vehicles on a dark Google Maps view, updating every 10 seconds
- **Fleet List** — vehicle cards with status, speed, odometer; search & filter
- **Trip History** — 7-day history with route replay on map
- **Mileage Reports** — daily / weekly / monthly totals per vehicle
- **Settings** — Wialon API token entry (stored securely with expo-secure-store)
- **Demo Mode** — works without a Wialon token using realistic Dubai-area mock data

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 51 |
| Routing | Expo Router (file-based) |
| Maps | react-native-maps (Google Maps) |
| Data | Wialon Hosting API |
| State | @tanstack/react-query |
| Storage | expo-secure-store |
| Language | TypeScript |

## Getting Started

```bash
cd apps/fleet-tracker
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `a` for Android emulator / `i` for iOS simulator.

## Wialon API Token

1. Log into your Wialon account  
2. Go to **User Settings → API Tokens**  
3. Create a new token with read access  
4. Open the app → Settings → paste the token

## Production Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas init

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## Before submitting to stores

1. Replace `YOUR_GOOGLE_MAPS_IOS_KEY` and `YOUR_GOOGLE_MAPS_ANDROID_KEY` in `app.json`
2. Replace `YOUR_EAS_PROJECT_ID` with your EAS project ID
3. Add app icon at `assets/icon.png` (1024×1024)
4. Add splash screen at `assets/splash.png` (1284×2778 recommended)

---

*Fleet Tracker · MDA / DREXONYX · Dubai, UAE*
