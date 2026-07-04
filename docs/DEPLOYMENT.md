# Deployment

How each piece of the platform is (and can be) deployed.

## Deployment topology

| Piece | Platform | Artifact | Public URL |
|-------|----------|----------|-----------|
| Backend API | Railway (Docker) | `Dockerfile` → Gunicorn | `https://api.velora-opti26.xyz` |
| Web app | Vercel | `frontend/dist/` (Vite build) | `https://opti26-velora.vercel.app` |
| Mobile app | Android APK | `Opti26_mobile/velora.apk` | distributed as a file |

## Backend — Docker + Gunicorn (Railway)

The `Dockerfile` at the repo root:

```dockerfile
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . /app
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt
RUN chmod +x optimizer/executables/linux/*
CMD gunicorn Opti26_Backend.wsgi --bind 0.0.0.0:$PORT --timeout 3600
```

Key points:
- **Ubuntu 24.04** is required because the committed Linux optimizer binaries link against **GLIBC ≥ 2.38**. An older base image would fail to run them.
- The Linux binaries are made executable at build time (`chmod +x`).
- **Gunicorn** serves the WSGI app; `--timeout 3600` allows long optimization runs (heavy inputs can take minutes).
- **`$PORT`** is injected by Railway; the app binds `0.0.0.0:$PORT`.

### Build & run locally
```bash
docker build -t opti26-backend .
docker run -e PORT=8000 -p 8000:8000 opti26-backend
# → http://localhost:8000
```

### Railway specifics
- Railway detects the Dockerfile and builds the image.
- It sets `PORT` automatically — do **not** hardcode it.
- No database provisioning is needed for the demo (SQLite lives in the container). **Note:** container filesystems are ephemeral — SQLite data resets on redeploy. For durable storage, attach a volume or switch to Postgres (`DATABASES` in `settings.py`).

### Backend prod checklist
- [ ] Add the frontend origin to `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in `settings.py`.
- [ ] (Recommended) move `SECRET_KEY` to an env var and tighten `ALLOWED_HOSTS`.
- [ ] (Recommended) switch to Postgres + a persistent volume if results must survive redeploys.

## Web app — Vercel

The `frontend/` app builds a static SPA:

```bash
cd frontend
npm install
npm run build       # → frontend/dist/
```

Deploy `frontend/dist/` to Vercel (Vercel auto-detects Vite). Configure the API base one of two ways:

1. **Env var:** set `VITE_API_URL=https://api.velora-opti26.xyz` in the Vercel project. `api.js` reads `import.meta.env.VITE_API_URL`.
2. **Rewrite:** add a Vercel rewrite mapping `/api/*` → the backend, keeping `VITE_API_URL` empty (same-origin calls).

> The current deployed origin is `https://opti26-velora.vercel.app`, which is already allow-listed in the backend CORS/CSRF settings.

## Mobile — Android APK

See [MOBILE_DOCUMENTATION.md](./MOBILE_DOCUMENTATION.md) for full steps. Summary:

```bash
cd Opti26_mobile
npm install
npm run mobile:build            # vite build + cap sync
cd android
./gradlew.bat assembleRelease --no-daemon
```

Release APK: `Opti26_mobile/android/app/build/outputs/apk/release/app-release.apk` (copied to `velora.apk`). The packaged app hits `https://api.velora-opti26.xyz` directly.

## External dependency: OSRM

The backend calls the **public** OSRM demo server (`router.project-osrm.org`) for distance matrices and route geometry. This is a shared, rate-limited service. For a robust production deployment, **self-host OSRM** and update the base URLs in `optimizer/utils.py` and `optimizer/views.py`. All OSRM calls already degrade gracefully (haversine / straight-line fallbacks) if the service is unavailable.

## Operational notes

- **Logs:** executable `stdout` is intentionally muted (`DEVNULL`) to avoid Railway log rate-limiting; only Django-level `print`/`stderr` surfaces. The `--timeout 3600` accommodates long solver runs.
- **Statelessness:** each request creates and deletes its own temp files; there is no shared on-disk work directory. The only server state is the SQLite DB and the in-memory `_current_progress` global.
- **Scaling caveat:** the progress global and single OSRM dependency mean the backend is best run as a **single instance** for the demo. Multi-instance scaling would require moving progress to a shared store (e.g. Redis) and self-hosting OSRM.
