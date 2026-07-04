# Mobile Documentation

The mobile app (`Opti26_mobile/`) is the **same React UI** as the web frontend, packaged as a native **Android** app using **Capacitor 8**. It renders the web bundle inside a native WebView and talks to the hosted backend.

## What Capacitor does here

Capacitor wraps a web build (`www/`) into a native Android project (`android/`). There is no separate native UI — the app *is* the React SPA running in a WebView, plus a couple of native plugins (StatusBar).

## Configuration (`capacitor.config.json`)

```json
{
  "appId": "com.opti26.app",
  "appName": "Velora Opti26",
  "webDir": "www",
  "plugins": {
    "StatusBar": {
      "overlaysWebView": false,
      "style": "DARK",
      "backgroundColor": "#0f1623"
    }
  },
  "android": { "allowMixedContent": true }
}
```

| Key | Meaning |
|-----|---------|
| `appId` | Android package id `com.opti26.app`. |
| `appName` | Display name "Velora Opti26". |
| `webDir` | Folder Capacitor packages — Vite builds the SPA into `www/`. |
| `StatusBar` | Dark status bar, `#0f1623` background, does not overlay the WebView. |
| `android.allowMixedContent` | Allows mixed HTTP/HTTPS content in the WebView. |

## Difference from the web app

The `src/` tree is a **mirror** of `frontend/src/` (identical components). The only meaningful difference:

- **`Opti26_mobile/src/api.js`** hard-codes the backend:
  ```js
  const API_BASE = "https://api.velora-opti26.xyz";
  ```
  There is no dev proxy in the packaged app, so all calls go directly to the hosted backend. (The web app instead uses `VITE_API_URL || ''` with a Vite proxy.)

- CORS allows `capacitor://localhost` (the WebView origin) — configured in the backend `settings.py`.

## Dependencies (mobile-specific)

On top of the shared UI stack, `Opti26_mobile/package.json` adds:

| Package | Purpose |
|---------|---------|
| `@capacitor/core`, `@capacitor/cli` | Capacitor runtime + CLI. |
| `@capacitor/android` | Android platform. |
| `@capacitor/status-bar` | StatusBar plugin. |
| `@capacitor/assets` (dev) | Generate icons/splash. |

## Build pipeline

### 1. Build the web bundle + sync to native

```bash
cd Opti26_mobile
npm install
npm run mobile:build      # = vite build && npx cap sync
```

- `vite build` compiles the SPA into `www/`.
- `npx cap sync` copies `www/` into the Android project and updates native plugins.

Useful sibling scripts:
- `npm run cap:open` → open the Android project in Android Studio.
- `npm run assets` → regenerate app icons/splash (white backgrounds).

### 2. Build the release APK

```bash
cd android
./gradlew.bat assembleRelease --no-daemon      # Windows
# ./gradlew assembleRelease --no-daemon          # macOS/Linux
```

Output:
- `Opti26_mobile/android/app/build/outputs/apk/release/app-release.apk`

Copied convenience artifacts committed at the project level:
- `Opti26_mobile/app-release.apk`
- `Opti26_mobile/velora.apk`

## Toolchain requirements

- **Node.js 18+** (for Vite + Capacitor CLI).
- **JDK 17+** and the **Android SDK** (Gradle builds the native project). Android Studio provides both.
- Gradle is invoked via the committed wrapper (`gradlew` / `gradlew.bat`), so no separate Gradle install is needed.

## Updating the app

Any change to the shared UI must be applied to **both** `frontend/src/` and `Opti26_mobile/src/` (they are copies, not a shared package). After editing `Opti26_mobile/src/`, re-run `npm run mobile:build` and rebuild the APK.

> Because the two `src/` trees are duplicated, keep them in sync deliberately — a fix in the web app is not automatically in the mobile app.

## Runtime behavior

- The app loads the bundled SPA from `www/` (offline-capable shell).
- Optimization, results, and route geometry all require network access to `https://api.velora-opti26.xyz`.
- Test cases and route geometry are cached in the WebView's `localStorage` (same mechanism as the web app).
