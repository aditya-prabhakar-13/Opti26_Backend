# API Reference

All HTTP endpoints exposed by the Django backend. Routing is defined in `Opti26_Backend/urls.py`; handlers live in `optimizer/views.py`.

Base URL:
- **Local:** `http://127.0.0.1:8000`
- **Hosted:** `https://api.velora-opti26.xyz`

All `/api/*` views are `@csrf_exempt` and return JSON (via `NpEncoder` for NumPy/NaN safety). CORS is restricted to the configured origins (see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)).

## Endpoint summary

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/` | Server-rendered HTML upload form (dev convenience). |
| POST | `/api/optimize` | Upload Excel and run full optimization. |
| POST | `/api/optimize/dynamic` | Insert new employee(s) into an existing solved case. |
| GET | `/api/progress` | Poll current optimization progress. |
| GET | `/api/results` | List recent results (max 50). |
| GET | `/api/results/<id>` | Get one full result. |
| DELETE | `/api/results/<id>` | Delete one result. |
| GET | `/api/results/latest` | Get the most recent result. |
| GET | `/api/route-geometry` | OSRM road-geometry lookup for map polylines. |
| — | `/admin/` | Django admin site. |

---

## POST `/api/optimize`

Upload an Excel workbook and run the three optimizer variants.

**Content-Type:** `multipart/form-data`

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `excel_file` | file (`.xlsx`) | yes | Must contain sheets `employees`, `vehicles`, `baseline`, `metadata`. |
| `optimization_mode` | integer | no | Forwarded to the solver as `config.alns_depth` (ALNS search depth). |

**Success `200`:**
```json
{
  "id": 12,
  "filename": "TestCase_TC01.xlsx",
  "created_at": "2026-02-20T15:27:00+00:00",
  "computed_metrics": {
    "vehicles_used": 4,
    "employees_covered": 18,
    "employees_unrouted": 0,
    "total_distance_km": 87.42,
    "total_cost": 4200.0,
    "baseline_cost": 6100.0,
    "net_savings": 1900.0,
    "savings_percentage": 31.1,
    "optimized_travel_time_min": 210,
    "baseline_travel_time_min": 360
  },
  "result": { /* full optimized output — see DATA_FORMATS.md */ },
  "result_noconstraints": { /* or null */ },
  "result_infeasible": { /* or null */ },
  "reports": { "report_optimized": null, "report_noconstraints": null, "report_infeasible": null },
  "evaluations": {
    "optimized":     { "stats": { /* ... */ }, "violations": [ /* ... */ ] },
    "noconstraints": { "stats": { /* ... */ }, "violations": [ /* ... */ ] },
    "infeasible":    null
  }
}
```

**Errors:**
- `400` — `{"error": "No excel_file provided"}` or `{"error": "optimization_mode must be an integer"}`.
- `405` — `{"error": "Method not allowed"}` (non-POST).
- `500` — `{"error": "<message>"}` (parse failure, optimizer crash, empty output, etc.). Common messages: `Only .xlsx files are supported`, `Missing required sheets: …`, `Primary output file is missing or empty…`.

> `reports.*` are currently always `null` — executable stdout is muted to avoid Railway log rate-limits.

---

## POST `/api/optimize/dynamic`

Insert new employee(s) into a previously solved case without full re-optimization.

**Content-Type:** `application/json`

**Body:**
```json
{
  "testCaseData": {
    "id": 12,
    "filename": "TestCase_TC01.xlsx",
    "result":               { /* previously solved optimized output */ },
    "result_noconstraints": { /* or omitted */ },
    "result_infeasible":    { /* or omitted */ }
  },
  "newEmployees": [
    {
      "id": "E99",
      "lat": 12.9611,
      "lng": 77.6387,
      "priority": 2,
      "earliest_pickup": "08:00",
      "latest_drop": "10:00",
      "vehicle_preference": "any",
      "sharing_preference": "triple",
      "baseline_cost": 320
    }
  ]
}
```

`newEmployees` may also be an object of the form `{ "new_employees": { "E99": { pickup:{lat,lng}, … } } }`.

**Behavior:** the backend validates/repairs consistency of the solved output, builds a `new_employee_data.json`, runs `velora_*_dynamic` for each mode, merges the new employees into the output (routed or `unrouted_employees`), re-evaluates, and returns the same envelope shape as `/api/optimize`.

**Errors:**
- `400` — `{"error": "Invalid JSON payload"}`.
- `405` / `500` — as above (e.g. `newEmployees is required`, `No consistent solved output found…`).

---

## GET `/api/progress`

Poll the current optimization stage. The frontend polls this every 500 ms during a run.

**Success `200`:**
```json
{ "stage": "optimizing", "percentage": 55, "message": "Running no constraints algorithm..." }
```

`stage` values progress through: `idle → starting → setup → parsing → routing → optimizing → processing → evaluating → saving → complete` (or `error`).

> Progress is a single global on the server (not per-session) — see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## GET `/api/results`

List up to 50 most-recent results (summary only, no full route data).

**Success `200`:**
```json
{
  "results": [
    {
      "id": 12,
      "filename": "TestCase_TC01.xlsx",
      "created_at": "2026-02-20T15:27:00+00:00",
      "computed_metrics": { /* same shape as above */ }
    }
  ]
}
```

Returns `{"results": []}` if the DB table doesn't exist yet (handled gracefully).

---

## GET `/api/results/<id>`  &  DELETE `/api/results/<id>`

- **GET** → full serialized result (same shape as `/api/optimize` success, minus `reports`/`evaluations` which are recomputed on optimize, plus the three `result*` payloads).
- **DELETE** → `{"ok": true, "deleted_id": <id>}`.
- `404` — `{"error": "Result not found"}` if missing.

---

## GET `/api/results/latest`

The single most-recent result, or `{"result": null}` if none.

---

## GET `/api/route-geometry`

Proxy to OSRM for a road-following polyline.

**Query param:**
- `coordinates` — semicolon-separated `lng,lat` pairs, e.g. `77.6,12.9;77.62,12.95;77.59,12.97`.

**Success `200`:**
```json
{
  "coordinates": [[12.9, 77.6], [12.905, 77.61], ...],
  "source": "osrm"
}
```

- `coordinates` are returned as `[lat, lng]` pairs (Leaflet order).
- `source` ∈ `"osrm"` (single full route), `"osrm-segmented"` (stitched per-segment), `"fallback"` (straight lines).

**Errors `400`:**
- `Missing coordinates query parameter`
- `Invalid coordinate format` / `Invalid numeric coordinates`
- `At least two coordinates are required`

---

## `/` (home) and `/admin/`

- `GET /` renders `optimizer/templates/optimizer/upload.html` — a minimal form that POSTs an Excel file to the same URL and runs `_execute_optimization` server-side (returns plain text on success/error). Handy for testing the backend without the SPA.
- `/admin/` — standard Django admin, with `OptimizationResult` registered (list shows `original_filename`, `created_at`).

## Client SDK

The frontend wraps all of these in `frontend/src/api.js` (and the mobile equivalent). Notable helpers:
- `optimizeExcelWithProgress(file, mode, onProgress)` — POSTs and polls progress concurrently.
- `fetchRoadGeometry(latLngPoints)` — calls `/api/route-geometry` with `localStorage` caching (7-day TTL).
- `postDynamicOptimization(testCaseData, newEmployees)`.
- localStorage test-case CRUD (`saveTestCaseLocally`, `fetchResults`, `deleteResult`, …).
