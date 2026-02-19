# Opti26 Backend + Frontend

Velora corporate mobility optimization system with:
- Django backend (`velora.exe` orchestration + result APIs)
- React + Vite frontend (Figma-inspired dashboard/test-cases/new-case flow)

## Project Structure
- `optimizer/` Django app for Excel parsing and optimizer execution
- `frontend/` React + Vite web UI
- `results/` runtime temporary optimizer files (ignored in git)

## Backend APIs
- `POST /api/optimize` upload `.xlsx` and run optimization
- `GET /api/results` list latest saved runs
- `GET /api/results/<id>` get one result with full payload
- `GET /api/results/latest` fetch most recent run

## Run Locally
1. Start backend:
```powershell
cd Opti26_Backend
python manage.py runserver
```

2. Start frontend:
```powershell
cd Opti26_Backend\frontend
npm install
npm run dev
```

3. Open `http://localhost:5173`.

## Notes
- Frontend proxies `/api/*` to Django at `http://127.0.0.1:8000`.
- `velora.exe` must exist in project root (`Opti26_Backend/velora.exe`).
- Only `.xlsx` input files are accepted.

## Mobile App (Android APK)
- Mobile wrapper project is included at `Opti26_mobile/` (Capacitor + Android).
- It loads the hosted frontend URL configured in `Opti26_mobile/capacitor.config.json`.
- Website URL update guide: [Change Website URL for Mobile App](#change-website-url-for-mobile-app)

### Build APK (Release)
1. Install mobile dependencies (one time):
```powershell
cd Opti26_mobile
npm install
```

2. Sync Capacitor config/assets to Android:
```powershell
cd Opti26_mobile
npx cap sync
```

3. Build release APK:
```powershell
cd Opti26_mobile\android
.\gradlew.bat assembleRelease
```

Release output:
- `Opti26_mobile/android/app/build/outputs/apk/release/app-release.apk`

### Build APK (Debug)
```powershell
cd Opti26_mobile\android
.\gradlew.bat assembleDebug
```

Debug output:
- `Opti26_mobile/android/app/build/outputs/apk/debug/app-debug.apk`

### Change Website URL for Mobile App
1. Open `Opti26_mobile/capacitor.config.json`.
2. Update `server.url` to your hosted frontend URL.

Example:
```json
"server": {
	"url": "http://10.57.61.159:5173",
	"cleartext": true
}
```

3. Sync and rebuild:
```powershell
cd Opti26_mobile
npx cap sync

cd android
.\gradlew.bat assembleRelease
```
