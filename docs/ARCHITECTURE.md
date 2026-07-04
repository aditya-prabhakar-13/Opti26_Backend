# Architecture

This document describes the end-to-end system design and the exact data flow through the platform.

## High-level component diagram

```
                    ┌──────────────────────────────────────────────────────────┐
                    │                        CLIENTS                            │
                    │                                                          │
                    │   React Web App (Vercel)        Android App (Capacitor)  │
                    │   frontend/  ── vite build       Opti26_mobile/ ── APK    │
                    │        │                              │                   │
                    └────────┼──────────────────────────────┼───────────────────┘
                             │  HTTPS JSON / multipart       │
                             ▼                               ▼
                    ┌──────────────────────────────────────────────────────────┐
                    │              DJANGO BACKEND (Railway, Docker)             │
                    │              Opti26_Backend/ + optimizer/                 │
                    │                                                          │
                    │   urls.py ──▶ views.py (orchestration)                    │
                    │                  │                                       │
                    │      ┌───────────┼───────────────┬──────────────┐        │
                    │      ▼           ▼               ▼              ▼        │
                    │  utils.py    subprocess      evaluator.py    requests   │
                    │  (Excel →    (velora_*        (constraint     (OSRM      │
                    │   JSON)       binaries)        checks)         proxy)    │
                    │      │           │               │              │        │
                    │      └───────────┴───────┬───────┴──────────────┘        │
                    │                          ▼                              │
                    │                    models.py ──▶ SQLite (db.sqlite3)     │
                    └──────────────────────────────────────────────────────────┘
                             │                               │
                             ▼                               ▼
                     OSRM public server            Native C++ optimizers
                 router.project-osrm.org        optimizer/executables/<os>/
```

## The two main flows

### Flow A — Standard optimization (`POST /api/optimize`)

1. **Upload.** The client sends `multipart/form-data` with an `excel_file` (`.xlsx`) and optional `optimization_mode` integer.
2. **Parse** (`utils.parse_excel_to_dict`). The four required sheets (`employees`, `vehicles`, `baseline`, `metadata`) are read with pandas/openpyxl, validated (no empty cells, valid vehicle speeds, all required columns present), and converted to a normalized dict. A **distance matrix** is built by calling the **OSRM table service**; if OSRM is unavailable, it falls back to the **haversine** great-circle distance.
3. **Serialize** the dict to a temp input JSON (using `NpEncoder` to make NumPy/NaN JSON-safe).
4. **Run three optimizers** via `subprocess.run([exe, input_json, output_json])`:
   - `velora_final` → optimized result (required; failure aborts the request).
   - `velora_noconstraints` → reference result (optional; skipped/warned if missing).
   - `velora_infeasiblehandling` → relaxed result (optional).
   Executable `stdout` is muted (`DEVNULL`) to avoid flooding Railway logs; `stderr` is captured.
5. **Read outputs.** Each output file is checked for existence and non-zero size (guards against a crashed binary that wrote nothing).
6. **Evaluate** each result with `evaluator.evaluate()` → hard/soft violation lists + stats.
7. **Persist** the optimized (and optional) results into the `OptimizationResult` table. If the table doesn't exist yet (first local run), it auto-runs `migrate`.
8. **Respond** with a serialized result including `computed_metrics`, the three result payloads, `reports`, and `evaluations`.
9. **Cleanup.** All temp files are deleted in a `finally` block.

Meanwhile, a module-level `_current_progress` dict is updated at each stage; the client polls `GET /api/progress` every 500 ms to render a live progress bar.

### Flow B — Dynamic insertion (`POST /api/optimize/dynamic`)

Used when a **new employee** must be added to an **already-solved** test case without recomputing from scratch.

1. Client sends JSON: `{ testCaseData, newEmployees }`.
2. The backend extracts each mode's previously solved output from `testCaseData`.
3. It checks **consistency** (every employee referenced in routes exists in `input.employees`). If none is consistent, it **auto-repairs** by backfilling missing employees from the incoming payload.
4. It builds a `new_employee_data.json` payload (inferring office drop coords from the first known employee).
5. For each mode it runs the corresponding `velora_*_dynamic` binary with `[solved_json, new_employees_json]`, which writes `updated_output.json`.
6. New employees are merged into the output (routed or marked unrouted), re-evaluated, and returned.

## Progress tracking design

Progress is stored in a **module-global** dict (`_current_progress`) in `views.py`, not per-session. This is intentionally simple:

- `progress_callback` mutates `_current_progress` at each stage (`setup → parsing → routing → optimizing → processing → evaluating → saving → complete`).
- `GET /api/progress` returns it verbatim.

> **Caveat:** because progress is a single global, concurrent optimizations would interfere. This is acceptable for the single-user/demo deployment.

## Route geometry (map drawing)

The map needs **real road-following polylines**, not straight lines. The backend exposes `GET /api/route-geometry?coordinates=lng,lat;lng,lat;...` which:

1. Tries a single OSRM `route` call for the whole path (with retries + exponential backoff).
2. Falls back to **stitching** per-segment OSRM calls.
3. Falls back to **straight lines** between points if OSRM is entirely unavailable.

The frontend (`api.js → fetchRoadGeometry`) additionally **caches** geometries in `localStorage` (7-day TTL, djb2 hash keys, quota-aware eviction) so repeated views don't re-hit the backend.

## Storage model — two places, two purposes

| Store | What lives there | Used by |
|-------|------------------|---------|
| **SQLite `db.sqlite3`** | Full `OptimizationResult` rows (all three result payloads). | Backend `/api/results*` endpoints. |
| **Browser `localStorage`** | The user's list of "test cases" incl. metrics, reports, evaluations. | Frontend results list, dashboard, dynamic editing. |

The frontend's list view is **localStorage-first** (see `api.js`), giving instant, offline-friendly test-case management. Deletes are best-effort mirrored to the DB.

## Cross-cutting concerns

- **CORS / CSRF**: `django-cors-headers` allows the Vercel origin, localhost dev ports, and Capacitor origins. API views are `@csrf_exempt` since they are called cross-origin as an API.
- **JSON encoding**: `NpEncoder` (in `utils.py`) makes NumPy scalars/arrays, `datetime`/`time`, and `NaN`/`inf` JSON-serializable.
- **Resilience**: DB-missing-table errors are caught and treated as "empty" for read endpoints; the optimizer's absence/crash is guarded at every step.

See [OPTIMIZATION_ENGINE.md](./OPTIMIZATION_ENGINE.md) for the optimizer contract and [DATA_FORMATS.md](./DATA_FORMATS.md) for the exact JSON shapes.
