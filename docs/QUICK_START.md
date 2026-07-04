# Quick Start

Get the whole platform running locally as fast as possible. For deeper detail see [INSTALLATION.md](./INSTALLATION.md) and [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md).

## Prerequisites (one-time)

- **Python 3.11+** (project targets Django 6.0.2 / Python 3.12-ish; 3.11+ works).
- **Node.js 18+** and **npm** (for the web frontend).
- On Linux/macOS you may need to make the optimizer binaries executable (see step 1c).

## 1. Backend (Django API)

From the repo root:

### Windows (PowerShell)
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### macOS / Linux (bash)
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
# (1c) ensure the native optimizers are executable:
chmod +x optimizer/executables/linux/*     # or .../macos/* on a Mac
python manage.py runserver
```

Backend is now at **http://127.0.0.1:8000**.

- Open `http://127.0.0.1:8000/` for the minimal built-in HTML upload form.
- The JSON API lives under `/api/*` (see [API_REFERENCE.md](./API_REFERENCE.md)).

## 2. Web frontend (React)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

The Vite dev server proxies `/api/*` to `http://localhost:8000`, so the frontend talks to your local backend automatically — no env var needed for local dev.

## 3. Try it

1. In the web app, go to **New Case**.
2. Upload an Excel workbook shaped like the required format (four sheets: `employees`, `vehicles`, `baseline`, `metadata` — see [DATA_FORMATS.md](./DATA_FORMATS.md)).
3. Watch the live progress bar.
4. Explore the resulting dashboard: map, trips, savings, and the constraint-violations report.

## 4. (Optional) Mobile app

```bash
cd Opti26_mobile
npm install
npm run mobile:build        # vite build + cap sync
cd android
./gradlew.bat assembleRelease --no-daemon   # Windows
# ./gradlew assembleRelease --no-daemon      # macOS/Linux
```

Release APK: `Opti26_mobile/android/app/build/outputs/apk/release/app-release.apk`.

> The mobile app talks to the **hosted** backend (`https://api.velora-opti26.xyz`), not your local one.

## Common gotchas

| Symptom | Fix |
|---------|-----|
| `FileNotFoundError: Executable not found` | On Linux/macOS run `chmod +x optimizer/executables/<os>/*`. |
| `Only .xlsx files are supported` | Upload a real `.xlsx`, not `.xls`/`.csv`. |
| `Missing required sheets` | Your workbook must contain `employees`, `vehicles`, `baseline`, `metadata`. |
| Map shows straight lines | OSRM public server was unreachable; geometry falls back to straight lines. |
| Frontend can't reach API | Ensure the Django server is running on `:8000` (dev proxy target). |

Next: [INSTALLATION.md](./INSTALLATION.md) for platform-specific detail.
