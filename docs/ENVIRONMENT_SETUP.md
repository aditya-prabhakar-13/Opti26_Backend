# Environment Setup

Configuration, environment variables, tooling versions, and the moving parts you may need to adjust per environment.

## Tooling versions

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.10+ (3.11/3.12 recommended) | Django 6.0.2 requirement. |
| Node.js | 18+ | For Vite frontends. |
| Django | 6.0.2 | Pinned in `requirements.txt`. |
| Vite | 5.4.x | Frontend/mobile build tool. |
| Capacitor | 8.x | Android wrapper. |
| Ubuntu (Docker) | 24.04 | Needed for GLIBC ≥ 2.38 required by the Linux optimizer binaries. |
| Gunicorn | latest | Production WSGI server. |

## Backend configuration (`Opti26_Backend/settings.py`)

The backend is configured **entirely in `settings.py`** — there is no `.env` file for the backend. The values you may want to change per environment:

| Setting | Current value | Notes / recommended change for real prod |
|---------|---------------|------------------------------------------|
| `SECRET_KEY` | hard-coded `django-insecure-…` | **Move to an env var** for production. |
| `DEBUG` | `False` | Fine for prod; set `True` locally for tracebacks. |
| `ALLOWED_HOSTS` | `['*']` | Restrict to your domain(s) in prod. |
| `DATABASES` | SQLite `db.sqlite3` | Swap to Postgres for real prod. |
| `CSRF_TRUSTED_ORIGINS` | Vercel + localhost dev ports | Add any new frontend origin here. |
| `CORS_ALLOWED_ORIGINS` | Vercel, localhost, `capacitor://localhost` | Add any new client origin here. |
| `CORS_ALLOW_ALL_ORIGINS` | `False` | Keep `False`; rely on the allowlist. |
| `TIME_ZONE` | `UTC` | |
| `STATIC_URL` / `MEDIA_URL` | `static/` / `/media/` | |

### CORS / CSRF allowlists (current)

`CORS_ALLOWED_ORIGINS`:
```
https://opti26-velora.vercel.app
http://localhost:5173
http://localhost:5174
https://localhost
http://localhost
capacitor://localhost
```

`CSRF_TRUSTED_ORIGINS`:
```
https://opti26-velora.vercel.app
http://localhost:5173
http://127.0.0.1:5173
http://localhost:5174
http://127.0.0.1:5174
```

> API endpoints under `/api/*` are `@csrf_exempt`, so CSRF mainly matters for the Django admin and the server-rendered upload form. CORS is what actually governs the SPA/mobile clients.

### The one backend "env var": `PORT`

Only used by the Docker/Railway deployment. The Dockerfile's start command binds Gunicorn to `0.0.0.0:$PORT`. Railway injects `PORT` automatically. Locally you use `runserver` instead, so you don't set it.

## Frontend configuration

### Web (`frontend/`)

- **`VITE_API_URL`** (optional env var, read in `src/api.js`):
  ```js
  const API_BASE = import.meta.env.VITE_API_URL || '';
  ```
  - **Unset (default):** `API_BASE` is empty, so calls go to `/api/*` on the same origin. In dev, Vite's proxy (`vite.config.js`) forwards `/api` → `http://localhost:8000`. In prod on Vercel, you must configure a rewrite or set `VITE_API_URL`.
  - **Set:** e.g. `VITE_API_URL=https://api.velora-opti26.xyz` to hit the hosted backend directly.

  To use it, create `frontend/.env` (or `.env.local`):
  ```
  VITE_API_URL=https://api.velora-opti26.xyz
  ```

- **Dynamic endpoint quirk:** `postDynamicOptimization` in `frontend/src/api.js` chooses its base URL from `process.env.NODE_ENV` (`http://localhost:8000` in development, `https://api.velora-opti26.xyz` otherwise) rather than `VITE_API_URL`. Keep this in mind if you repoint the backend.

- **Vite dev proxy** (`frontend/vite.config.js`): serves on port **5173**, `host: true` (LAN accessible), proxies `/api` → `:8000`, and aliases `@` → `./src`.

### Mobile (`Opti26_mobile/`)

- `src/api.js` **hard-codes** `const API_BASE = "https://api.velora-opti26.xyz";` — the packaged app always talks to the hosted backend. To point a debug build at another backend, edit this constant before `npm run mobile:build`.
- `capacitor.config.json`: `appId: com.opti26.app`, `appName: "Velora Opti26"`, `webDir: "www"`, StatusBar plugin (dark, `#0f1623`), `android.allowMixedContent: true`.

## External services

| Service | Endpoint | Used for | Fallback |
|---------|----------|----------|----------|
| **OSRM (table)** | `http://router.project-osrm.org/table/v1/driving/` | Distance matrix during Excel parsing. | Haversine great-circle distance. |
| **OSRM (route)** | `http://router.project-osrm.org/route/v1/driving/` | Road-following polylines for the map. | Per-segment stitching → straight lines. |

No API key is required (public demo server). If you self-host OSRM, update the base URLs in `optimizer/utils.py` (`OSRM_BASE_URL`) and `optimizer/views.py` (`_fetch_osrm`).

## Executable resolution

`optimizer/views.py → get_exe_path(name)` resolves binaries as:

```
optimizer/executables/<win|linux|macos>/<name>[.exe]
```

- OS folder is chosen from `os.name` / `platform.system()`.
- `.exe` suffix is appended on Windows.
- Raises `FileNotFoundError` if the binary is missing — so ensure the correct per-OS folder is populated and executable.

## Summary checklist

- [ ] Python venv created + `requirements.txt` installed.
- [ ] `python manage.py migrate` run.
- [ ] Linux/macOS: binaries `chmod +x`'d.
- [ ] Frontend `npm install` done.
- [ ] (Prod) `VITE_API_URL` / Vercel rewrite pointing at the backend.
- [ ] (Prod) `SECRET_KEY`, `ALLOWED_HOSTS`, DB reviewed.
