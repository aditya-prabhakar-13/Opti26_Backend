# Installation

Detailed, platform-by-platform installation for all three sub-apps. For the condensed version see [QUICK_START.md](./QUICK_START.md).

## 1. Clone and inspect

```bash
git clone <repo-url> Opti26_Backend
cd Opti26_Backend
```

Repo layout at a glance: `optimizer/` + `Opti26_Backend/` (backend), `frontend/` (web), `Opti26_mobile/` (Android). See [APP_STRUCTURE.md](./APP_STRUCTURE.md).

## 2. Backend (Django)

### 2.1 Python version

The backend targets **Django 6.0.2**, which requires **Python 3.10+** (3.11/3.12 recommended). Verify:

```bash
python --version    # or python3 --version
```

### 2.2 Virtual environment + dependencies

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

**macOS / Linux (bash):**
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Dependencies installed (`requirements.txt`):

| Package | Version | Why |
|---------|---------|-----|
| `Django` | 6.0.2 | Web framework. |
| `django-cors-headers` | 4.7.0 | Cross-origin support for the SPA/mobile clients. |
| `numpy` | 2.4.2 | Numeric handling in parsing / `NpEncoder`. |
| `openpyxl` | 3.1.5 | Excel `.xlsx` reading engine for pandas. |
| `pandas` | 3.0.0 | Excel sheet parsing / dataframe transforms. |
| `requests` | 2.32.5 | OSRM HTTP calls. |
| `gunicorn` | latest | Production WSGI server (Docker/Railway). |

### 2.3 Native optimizer binaries

The optimizer executables are **committed to the repo** under `optimizer/executables/{win,linux,macos}/`. No compilation needed.

On **Linux/macOS**, mark them executable (Windows `.exe` needs nothing):

```bash
chmod +x optimizer/executables/linux/*     # on Linux
chmod +x optimizer/executables/macos/*     # on macOS
```

The backend auto-selects the right folder by OS (`optimizer/views.py → get_exe_path`).

### 2.4 Database

Apply migrations to create the SQLite schema:

```bash
python manage.py migrate
```

This creates/updates `db.sqlite3`. (The backend also auto-migrates on first write if the table is missing — see `_save_optimization_result` in `views.py`.)

Optionally create an admin user to browse results:

```bash
python manage.py createsuperuser
```

### 2.5 Run

```bash
python manage.py runserver          # http://127.0.0.1:8000
```

## 3. Web frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Build for production:

```bash
npm run build          # outputs to frontend/dist/
npm run preview        # preview the production build locally
```

Key deps: React 18, Vite 5, Tailwind CSS v4 (`@tailwindcss/vite`), Leaflet + react-leaflet (maps), `@react-pdf/renderer` (PDF export), `lucide-react` (icons), shadcn/ui + Radix + `@base-ui/react` (components), `dom-to-image`.

## 4. Mobile app (Capacitor / Android)

Requires the **Android SDK** and a JDK (for Gradle). See [MOBILE_DOCUMENTATION.md](./MOBILE_DOCUMENTATION.md) for full toolchain notes.

```bash
cd Opti26_mobile
npm install
npm run mobile:build              # vite build + npx cap sync
cd android
./gradlew.bat assembleRelease --no-daemon    # Windows
# ./gradlew assembleRelease --no-daemon       # macOS/Linux
```

Output APK: `Opti26_mobile/android/app/build/outputs/apk/release/app-release.apk` (also copied to `Opti26_mobile/velora.apk`).

## 5. Docker (backend container)

```bash
docker build -t opti26-backend .
docker run -e PORT=8000 -p 8000:8000 opti26-backend
```

The image is Ubuntu 24.04 (needed for GLIBC ≥ 2.38 that the Linux binaries link against), installs Python deps, `chmod +x` the Linux binaries, and starts Gunicorn. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Verifying the install

```bash
# Backend health (should return JSON progress state):
curl http://127.0.0.1:8000/api/progress
# → {"stage": "idle", "percentage": 0, "message": ""}

# Results list (empty on a fresh DB):
curl http://127.0.0.1:8000/api/results
# → {"results": []}
```

If both return JSON, the backend is correctly installed. Then upload a valid `.xlsx` from the frontend or the `/` HTML form to exercise the full pipeline.
