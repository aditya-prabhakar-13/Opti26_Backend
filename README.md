# Opti26 (Backend + Web + Mobile)

Corporate mobility optimization platform with:
- Django backend (`optimizer/`) for Excel parsing, executable orchestration, route geometry and results APIs
- React + Vite web app (`frontend/`)
- Capacitor Android app wrapper (`Opti26_mobile/`) synced from current web UI

## Repository Layout
- `manage.py`, `Opti26_Backend/` Django project entry/config
- `optimizer/` backend app (Excel parser, optimization orchestration, evaluator, executables)
- `frontend/` current web frontend
- `Opti26_mobile/` mobile frontend + Android project (Capacitor)

## Backend API Endpoints
- `POST /api/optimize` upload Excel (`excel_file`) and run optimization
- `POST /api/optimize/dynamic` dynamic insertion flow for new employees
- `GET /api/progress` optimization progress polling
- `GET /api/results` list results
- `GET /api/results/<id>` get one result
- `DELETE /api/results/<id>` delete one result
- `GET /api/results/latest` latest result
- `GET /api/route-geometry?coordinates=lng,lat;...` OSRM geometry lookup

## Executables
Executable binaries are resolved by OS from:
- `optimizer/executables/win/`
- `optimizer/executables/linux/`
- `optimizer/executables/macos/`

Standard optimization uses:
- `velora_final`
- `velora_noconstraints`
- `velora_infeasiblehandling`

Dynamic optimization uses:
- `velora_final_dynamic`
- `velora_noconstraints_dynamic`
- `velora_infeasiblehandling_dynamic`

## Local Run
From repo root:

1. Backend
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

2. Web frontend
```powershell
cd frontend
npm install
npm run dev
```

3. Open:
- Web: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`

## Current Frontend API Base
API base is hardcoded in client:
- `frontend/src/api.js` -> `https://api.velora-opti26.xyz`
- `Opti26_mobile/src/api.js` -> `https://api.velora-opti26.xyz`

## Mobile Build (Android)
From `Opti26_mobile/`:

```powershell
npm install
npm run mobile:build
```

Then build release APK:
```powershell
cd android
.\gradlew.bat assembleRelease --no-daemon
```

Release APK output:
- `Opti26_mobile/android/app/build/outputs/apk/release/app-release.apk`

Project-level copied APKs:
- `Opti26_mobile/app-release.apk`
- `Opti26_mobile/velora.apk`
