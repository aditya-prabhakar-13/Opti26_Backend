# Implementation Summary

A consolidated, single-page summary of how the whole platform is implemented and why the key decisions were made. Read this if you want the "everything at once" view; read the linked docs for depth.

## What it is

**Opti26 / Velora** optimizes corporate employee cab-pooling. Upload an Excel workbook (employees, vehicles, baseline costs, metadata) → get optimized shared routes with cost/time savings, a map, and a constraint-violations report. A React web app and a Capacitor Android app consume the same Django JSON API.

## The pipeline in one paragraph

`POST /api/optimize` receives an `.xlsx` → `parse_excel_to_dict` validates the four sheets and builds a normalized JSON input (with an OSRM/haversine distance matrix) → the input JSON is fed to **three native C++ binaries** (`velora_final`, `velora_noconstraints`, `velora_infeasiblehandling`) via `subprocess` → each output JSON is checked, run through the Python **constraint evaluator** (H1–H6 hard, S1–S4 soft), persisted to SQLite as an `OptimizationResult`, and returned with computed metrics and evaluations. The client polls `GET /api/progress` for a live progress bar. A parallel `POST /api/optimize/dynamic` flow inserts new employees into an already-solved plan using `velora_*_dynamic` binaries.

## Key files (the ones that matter)

| File | Responsibility |
|------|----------------|
| `optimizer/views.py` | All request handling + orchestration (parse → run binaries → evaluate → persist → respond), progress, dynamic insertion, OSRM route proxy. |
| `optimizer/utils.py` | Excel→dict parsing, OSRM distance matrix + haversine fallback, `NpEncoder`. |
| `optimizer/models.py` | The single `OptimizationResult` model (three JSON result blobs + filename + timestamp). |
| `optimizer/executables/evaluator.py` | Constraint checker (importable + CLI). |
| `optimizer/executables/{win,linux,macos}/velora_*` | Native optimizer binaries (opaque). |
| `Opti26_Backend/settings.py` / `urls.py` | Config (CORS/CSRF/DB) and routing. |
| `frontend/src/App.jsx` | Web UI orchestration. |
| `frontend/src/api.js` | Backend calls + localStorage store + route-geometry cache. |
| `frontend/src/lib/transform.js` | API payload → view models (metrics, map data). |

## Design decisions & rationale

| Decision | Why |
|----------|-----|
| **Native C++ binaries called via subprocess** | The optimization core is compute-heavy and pre-existing; Django just orchestrates I/O. Binaries are shipped per-OS and selected at runtime. |
| **Three solver variants per run** | Lets the UI compare the constrained solution against a relaxed upper bound and an infeasible-handling run. |
| **Results as `JSONField` blobs** | Solver output is a large, immutable, variable-shape document never queried by nested field — relational modeling would add cost without benefit. |
| **Metrics computed on read** | Formulas can evolve without a migration; the row stays the source of truth. |
| **Temp files, deleted in `finally`** | No persistent scratch dir; each request is self-contained and clean. |
| **Executable stdout → DEVNULL** | The C++ code is chatty; muting prevents Railway log rate-limiting/crashes. `stderr` is still captured for errors. |
| **Progress as a module global** | Dead simple for a single-user demo; polled via `/api/progress`. (Trade-off: not concurrency-safe.) |
| **localStorage-first frontend list** | Instant, offline-friendly test-case management; DB still stores full results, deletes are best-effort mirrored. |
| **OSRM with graceful fallbacks** | Real road distances/geometry when available; haversine / straight-line fallback keeps the app working when OSRM is down. |
| **Route-geometry caching in the browser** | 7-day TTL cache avoids re-hitting OSRM for the same routes; quota-aware eviction. |
| **Auto-migrate + missing-table guards** | First-run friendliness — the app self-heals a missing DB table on write, and read endpoints degrade to empty instead of 500. |
| **Dynamic insertion with auto-repair** | Adding an employee to a slightly-inconsistent stored case still works by backfilling missing employee data before running the dynamic solver. |
| **Capacitor mobile = same SPA** | One UI codebase (duplicated into `Opti26_mobile/src/`), wrapped in a WebView; only the API base URL differs. |

## Data contracts (see DATA_FORMATS.md)

- **Input Excel:** sheets `employees` (10 required columns), `vehicles` (needs `avg_speed_kmph > 0`), `baseline`, `metadata`. No empty cells allowed.
- **Solver output JSON:** `{ input, summary, vehicles[].trips[].{route, passengers, times, distance}, unrouted_employees }`.
- **Evaluator output:** `{ stats, violations[] }` with hard/soft constraint IDs.

## Constraints enforced/checked (see OPTIMIZATION_ENGINE.md)

- **Hard (fail if violated):** H1 all routed, H2 earliest pickup, H3 latest drop, H4 capacity, H5 uniqueness, H6 known employee.
- **Soft (warnings):** S1 vehicle-category preference, S2 sharing preference, S3 priority delay budget, S4 cost vs baseline.

## Deployment (see DEPLOYMENT.md)

- **Backend:** Docker (Ubuntu 24.04 for GLIBC 2.38) + Gunicorn on Railway (`https://api.velora-opti26.xyz`).
- **Web:** Vite build on Vercel (`https://opti26-velora.vercel.app`).
- **Mobile:** Gradle release APK (`velora.apk`) pointing at the hosted backend.

## Known limitations / future work

- No authentication; API is open (CORS-restricted only).
- `SECRET_KEY` hard-coded, `ALLOWED_HOSTS=['*']` — demo-grade security.
- SQLite in an ephemeral container resets on redeploy (switch to Postgres + volume for durability).
- Single-instance assumption (global progress state, shared public OSRM).
- Web and mobile `src/` are duplicated and must be kept in sync manually.

## Where to start reading the code

1. `optimizer/views.py` — follow `api_optimize → _execute_optimization`.
2. `optimizer/utils.py` — `parse_excel_to_dict`.
3. `optimizer/executables/evaluator.py` — `evaluate`.
4. `frontend/src/App.jsx` → `frontend/src/api.js` → `frontend/src/lib/transform.js`.
