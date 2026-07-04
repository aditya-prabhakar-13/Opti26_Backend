# Frontend Documentation

The web frontend is a **single-page React application** built with Vite. Location: `frontend/`. The mobile app (`Opti26_mobile/`) shares an identical component set — see [MOBILE_DOCUMENTATION.md](./MOBILE_DOCUMENTATION.md) for the differences.

## Tech stack

| Concern | Library |
|---------|---------|
| Framework | React 18 |
| Build tool | Vite 5 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), `tw-animate-css` |
| Components | shadcn/ui + Radix UI + `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| Icons | `lucide-react` |
| Maps | Leaflet + `react-leaflet` |
| PDF export | `@react-pdf/renderer` |
| Image capture | `dom-to-image` |
| Fonts | `@fontsource-variable/inter` |

## Entry points

- `index.html` → mounts `src/main.jsx`.
- `src/main.jsx` → renders `<App />`.
- `src/App.jsx` (~670 lines) → the top-level orchestrator: navigation state, results state, upload flow, route-geometry loading, dynamic insertion.

## Application state & navigation (`App.jsx`)

`App.jsx` holds the central state:

| State | Purpose |
|-------|---------|
| `activeNav` / `effectiveNav` | Current view: `new`, `dashboard`, `testcases`. Falls back to `new` when there are no cases. |
| `results` | List of saved test cases (from localStorage). |
| `selectedResult` | The currently-open result (normalized via `transform.js`). |
| `selectedFile` | The Excel file staged for upload. |
| `mapMode` | Which solver output to show: `optimized` / `noconstraints` / `infeasible`. |
| `vehicleFilter` | Filter map to `ALL` or a specific vehicle. |
| `routeGeometries` | Cached road polylines per mode. |
| `progress` / `showProgress` | Live optimization progress bar. |
| `isMobile`, `sidebarOpen` | Responsive layout. |

**Bootstrap:** on mount, `App` loads test cases from localStorage (`fetchResults()`), and if any exist, opens the dashboard on the newest one (`fetchResultDetail`). If none, it shows the New Case view.

## Data layer (`src/api.js`)

`api.js` is the single module for all I/O. It has three responsibilities:

1. **Backend calls:**
   - `optimizeExcelWithProgress(file, mode, onProgress)` — POSTs to `/api/optimize` and concurrently polls `/api/progress` every 500 ms (up to 5 min) to drive the progress bar.
   - `optimizeExcel`, `getProgress`, `fetchLatestResult`.
   - `postDynamicOptimization(testCaseData, newEmployees)` — POSTs to `/api/optimize/dynamic`.
   - `fetchRoadGeometry(latLngPoints)` — GETs `/api/route-geometry` with caching.
2. **localStorage test-case store** (key `velora_testcases`): `saveTestCaseLocally`, `upsertTestCaseLocally`, `fetchResults`, `getTestCaseFromLocalStorage`, `fetchResultDetail`, `deleteResult`, `deleteAllTestCases`. Deletes also best-effort DELETE the DB row.
3. **Route-geometry cache** (`localStorage`, prefix `velora_route_`, version `v2`, 7-day TTL): djb2-hashed keys, quota-aware eviction (`evictOldestRoutes`), and `clearRouteCache()`. Straight-line fallback responses are **not** cached.

`API_BASE` = `import.meta.env.VITE_API_URL || ''` (empty → same-origin `/api`, proxied to `:8000` in dev). See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md).

## Transform layer (`src/lib/transform.js`)

Pure functions that turn API payloads into view models:

| Function | Purpose |
|----------|---------|
| `normalizeOptimizationPayload(apiPayload)` | Flattens the API result into a consistent camelCase shape (`result`, `resultNoConstraints`, `resultInfeasible`, `computedMetrics`, `evaluations`, …). |
| `toResultsListRows(payload)` | Maps `/api/results` → list rows. |
| `getMetrics(payload, mode)` | Returns the metric object for a mode (prefers backend `computedMetrics` for `optimized`, else recomputes via `fallbackMetrics`). |
| `buildMapData(payload, mode)` | Builds map markers (pickup/drop), per-trip polylines (colored, ordered by `route` tokens), waypoints, and tooltips from the solver output. |

`TRIP_COLORS` is an 8-color palette cycled across trips.

## Component catalog (`src/components/`)

| Component | Role |
|-----------|------|
| `Sidebar.jsx` | Left navigation between New Case / Dashboard / Test Cases. |
| `NewCaseView.jsx` | Upload screen: file picker + optimization-mode (ALNS depth) selector + run button. |
| `DashboardView.jsx` | The results dashboard shell (map + stats + timelines + violations). |
| `TestcasesView.jsx` | List of saved test cases with open/delete. |
| `MapPanel.jsx` | Leaflet map: employee markers, colored route polylines (road geometry via `fetchRoadGeometry`), vehicle filter, legend. |
| `TripTimeline.jsx` | Per-trip schedule (pickup/drop times, load). |
| `SavingsWaterfall.jsx` | Baseline → optimized cost waterfall chart. |
| `StatCard.jsx` | KPI tiles (vehicles used, employees covered, savings %, distance, time). |
| `ResultTable.jsx` | Tabular per-employee / per-trip breakdown. |
| `ViolationsReport.jsx` | Renders evaluator `evaluations` (hard/soft violations grouped by constraint). |
| `AddEmployeeModal.jsx` | Form to add a new employee → triggers dynamic optimization. |
| `PDFReport.jsx` | Generates a downloadable PDF report via `@react-pdf/renderer`. |
| `ProgressBar.jsx` + `.css` | Optimization progress bar (stage + %). |
| `RouteLoadingProgress.jsx` + `.css` | Indicator while map route geometries load. |
| `ui/` | shadcn/ui primitives: `button`, `card`, `select`, `input`, `badge`, `dropdown-menu`, `alert-dialog`, `combobox`, `field`, `label`, `separator`, `textarea`, `input-group`. |

## Key UX flows

### Run an optimization
1. `NewCaseView` stages a file + mode → calls `optimizeExcelWithProgress`.
2. Progress bar animates from server-reported stages.
3. On success, the result is normalized, **saved to localStorage** (`saveTestCaseLocally`), and the dashboard opens.

### Explore results
- Toggle `mapMode` (optimized / noconstraints / infeasible) to compare solver variants.
- Filter the map by vehicle.
- Road polylines are fetched lazily and cached; a loading indicator shows progress.
- Export a PDF of the current result.

### Add an employee (dynamic)
- `AddEmployeeModal` collects the new employee → `postDynamicOptimization(selectedResult, [newEmp])`.
- The updated result is upserted into localStorage (`upsertTestCaseLocally`) and re-rendered.

## Build & config

- `vite.config.js`: React + Tailwind plugins, dev server on `5173` (`host: true`), `/api` proxy → `:8000`, `@` alias → `./src`.
- `components.json`: shadcn/ui configuration.
- `jsconfig.json`: editor path resolution.
- Scripts: `npm run dev` / `build` / `preview`.

Build output goes to `frontend/dist/` and is what Vercel serves.
