# Application Structure

A complete map of the repository. Every top-level folder and every significant file is described.

## Top-level layout

```
Opti26_Backend/                    ← repo root (also the Django project name)
├── manage.py                      ← Django CLI entry point
├── db.sqlite3                     ← SQLite database (results storage)
├── requirements.txt               ← Python dependencies
├── Dockerfile                     ← Backend container (Ubuntu 24.04 + Gunicorn)
├── README.md                      ← Top-level project readme
├── .gitignore
│
├── Opti26_Backend/                ← Django PROJECT (settings/urls/wsgi/asgi)
├── optimizer/                     ← Django APP (the actual logic + binaries)
├── results/                       ← (empty) legacy/scratch output dir
│
├── frontend/                      ← React + Vite web app
├── Opti26_mobile/                 ← Capacitor Android app (same UI)
└── docs/                          ← ← you are here
```

## `Opti26_Backend/` — the Django *project*

Global configuration and URL routing.

| File | Purpose |
|------|---------|
| `settings.py` | Django settings: installed apps, middleware, CORS/CSRF origins, SQLite DB, static/media, `DEBUG=False`, `ALLOWED_HOSTS=['*']`. |
| `urls.py` | The URL → view routing table (all `/api/*` endpoints + admin + upload page). |
| `wsgi.py` | WSGI entry point (used by Gunicorn in the Dockerfile). |
| `asgi.py` | ASGI entry point (not used by default deployment). |
| `__init__.py` | Marks the package. |

## `optimizer/` — the Django *app* (core backend logic)

| Path | Purpose |
|------|---------|
| `views.py` | **The heart of the backend.** All request handling + orchestration: Excel parsing calls, subprocess execution of `velora_*`, evaluation, DB persistence, progress tracking, dynamic insertion, OSRM route-geometry proxy. |
| `utils.py` | Excel → dict parsing (`parse_excel_to_dict`), OSRM distance-matrix + haversine fallback, `NpEncoder` (NumPy/NaN-safe JSON), value cleaners. |
| `models.py` | `OptimizationResult` model — stores the three result JSON payloads + filename + timestamp. |
| `admin.py` | Registers `OptimizationResult` in the Django admin. |
| `apps.py` | `OptimizerConfig` app config. |
| `tests.py` | Placeholder (no tests written). |
| `migrations/` | DB schema migrations (`0001_initial`, `0002_*` adds the noconstraints/infeasible JSON fields). |
| `templates/optimizer/upload.html` | A minimal server-rendered HTML upload form (the `/` home page for direct backend use). |
| `executables/` | The optimization engine — see below. |

### `optimizer/executables/`

| Path | Purpose |
|------|---------|
| `evaluator.py` | **Constraint evaluator.** Checks solver output against hard (H1–H6) and soft (S1–S4) constraints. Importable (`evaluate()`) and runnable as a CLI. |
| `win/velora_*.exe` | Native Windows optimizer binaries. |
| `linux/velora_*` | Native Linux optimizer binaries (used in the Docker deployment). |
| `macos/velora_*` | Native macOS optimizer binaries. |
| `__init__.py` | Makes `executables` an importable package (so `evaluator.evaluate` can be imported). |

Each OS folder contains six binaries:
`velora_final`, `velora_noconstraints`, `velora_infeasiblehandling`, and their `*_dynamic` counterparts.

## `frontend/` — React web app

```
frontend/
├── index.html                 ← Vite HTML entry
├── package.json               ← deps + scripts (dev/build/preview)
├── vite.config.js             ← Vite config: React + Tailwind plugins, /api proxy → :8000, "@" alias
├── jsconfig.json              ← path intellisense
├── components.json            ← shadcn/ui config
├── public/                    ← static assets
├── dist/                      ← build output (gitignored normally)
└── src/
    ├── main.jsx               ← React root mount
    ├── App.jsx                ← top-level app: nav, state, orchestration (~670 lines)
    ├── api.js                 ← all backend calls + localStorage test-case store + route cache
    ├── styles.css             ← global styles
    ├── assets/                ← logo SVG
    ├── lib/
    │   ├── transform.js       ← API payload → view models (metrics, map data)
    │   ├── utils.js / util.js ← helpers (cn(), misc)
    └── components/
        ├── Sidebar.jsx            ← navigation
        ├── NewCaseView.jsx       ← upload screen + optimization mode picker
        ├── DashboardView.jsx     ← results dashboard shell
        ├── TestcasesView.jsx     ← saved test-case list
        ├── MapPanel.jsx          ← Leaflet map + route polylines
        ├── TripTimeline.jsx      ← per-trip schedule visualization
        ├── SavingsWaterfall.jsx  ← cost-savings chart
        ├── StatCard.jsx          ← KPI tiles
        ├── ResultTable.jsx       ← tabular results
        ├── ViolationsReport.jsx  ← constraint violations display
        ├── AddEmployeeModal.jsx  ← dynamic-insertion form
        ├── PDFReport.jsx         ← @react-pdf/renderer export
        ├── ProgressBar.jsx/.css  ← optimization progress UI
        ├── RouteLoadingProgress  ← map route-loading indicator
        └── ui/                   ← shadcn/ui primitives (button, card, select, …)
```

## `Opti26_mobile/` — Capacitor Android app

```
Opti26_mobile/
├── capacitor.config.json      ← appId com.opti26.app, webDir "www", StatusBar plugin
├── package.json               ← same UI deps + @capacitor/* + mobile:build script
├── vite.config.js             ← Vite config
├── index.html
├── src/                        ← IDENTICAL component set to frontend/src
│                                 (api.js hard-codes https://api.velora-opti26.xyz)
├── www/                        ← Vite build output that Capacitor packages
├── android/                    ← native Android Gradle project
├── assets/, icons/, public/    ← app icons / splash
├── velora.apk                  ← built release APK
└── app-release.apk             ← copied release APK
```

The mobile `src/` is a mirror of the web `src/`; the key difference is `api.js` points at the hosted backend rather than using a Vite dev proxy.

## `results/`

An empty directory retained from an earlier design where output JSON was written to disk. Current code uses **system temp files** (`tempfile`) and deletes them, so `results/` is effectively unused.

## `db.sqlite3`

The live SQLite database file holding `OptimizationResult` rows. Gitignored by pattern in most setups but present here for the demo.

For the model/schema details see [MODELS_DOCUMENTATION.md](./MODELS_DOCUMENTATION.md).
