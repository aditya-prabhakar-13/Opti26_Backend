# Project Overview

## What is Opti26 / Velora?

**Opti26** (product name **Velora**) is a **corporate mobility optimization platform**. Companies that provide employee transport (cab/shuttle pooling to and from an office) upload a spreadsheet describing their employees, available vehicles, and current ("baseline") transport costs. The platform computes **optimized vehicle routes** that pool employees together to minimize cost and travel time while respecting a set of operational constraints (pickup/drop time windows, vehicle capacity, sharing preferences, vehicle-category preferences, and priority delay budgets).

The result is presented as an interactive dashboard — a map of routes, per-trip timelines, cost-savings breakdowns, a constraint-violation report, and an exportable PDF.

## The problem it solves

Manually assigning dozens of employees to a fleet of vehicles is a hard combinatorial routing problem (a variant of the **Vehicle Routing Problem with Time Windows**, VRPTW). Velora automates this:

- **Pools** employees into shared trips instead of one-cab-per-person.
- **Respects hard constraints** that must never be broken (time windows, capacity, uniqueness).
- **Honors soft preferences** where possible (premium vehicles, sharing limits, priority delays).
- **Quantifies savings** against the company's existing baseline cost.
- **Supports dynamic changes** — inserting a newly added employee into an already-solved plan without re-running everything from scratch.

## The three sub-applications

The repository is a **monorepo** containing three deployable pieces plus the shared optimization engine:

### 1. Django backend (`optimizer/`, `Opti26_Backend/`)
- Parses the uploaded Excel workbook into a normalized JSON structure.
- Orchestrates the native optimizer executables (subprocess calls).
- Runs a Python **constraint evaluator** on every result.
- Persists results in SQLite and exposes a JSON HTTP API.
- Proxies **OSRM** (Open Source Routing Machine) road-geometry lookups for drawing real road paths on the map.

### 2. React web frontend (`frontend/`)
- Single-page app (Vite + React 18 + Tailwind CSS v4).
- Lets the user upload an Excel file, watch live progress, and explore results.
- Renders an interactive **Leaflet** map, trip timelines, savings waterfalls, stat cards, a violations report, and a downloadable **PDF report**.
- Stores test cases in the browser's **localStorage** (results list is client-side, not DB-backed for the list view).

### 3. Capacitor Android app (`Opti26_mobile/`)
- The **same** React UI as the web app, wrapped by **Capacitor 8** into a native Android WebView app.
- Talks to the hosted backend (`https://api.velora-opti26.xyz`).
- Produces a release `.apk` (`velora.apk`).

### The optimization engine (`optimizer/executables/`)
- Precompiled **native C++ binaries** (`velora_*`) provided per-OS (`win/`, `linux/`, `macos/`).
- A Python **`evaluator.py`** that checks the solver output against all constraints.

## Three optimization "modes"

For each input, the backend runs **three** solver variants and returns all three so the UI can compare them:

| Mode | Executable | Meaning |
|------|-----------|---------|
| **Optimized** | `velora_final` | The primary, constraint-respecting solution. |
| **No constraints** | `velora_noconstraints` | An upper-bound / reference run with constraints relaxed. |
| **Infeasible handling** | `velora_infeasiblehandling` | A run that gracefully handles otherwise-infeasible inputs. |

The dynamic-insertion flow has parallel `*_dynamic` binaries.

## Optimization modes vs. "ALNS depth"

The web UI can also pass an `optimization_mode` integer that is forwarded to the solver as a `config` entry (`alns_depth`) — this tunes how deeply the **ALNS** (Adaptive Large Neighborhood Search) metaheuristic explores solutions. Higher depth = more search effort = potentially better routes but slower.

## Where things are hosted

| Piece | Host | URL |
|-------|------|-----|
| Backend API | Railway (Docker) | `https://api.velora-opti26.xyz` |
| Web app | Vercel | `https://opti26-velora.vercel.app` |
| Mobile | Android APK | `Opti26_mobile/velora.apk` |

## Non-goals / current limitations

- **Auth**: There is no user authentication; the API is open (CORS-restricted).
- **Results list** in the frontend is stored in `localStorage`, not fetched from the DB — the DB stores full results but the UI's "test cases" list is client-side.
- **`DEBUG = False`** with a hard-coded `SECRET_KEY` and `ALLOWED_HOSTS = ['*']` — acceptable for the hackathon/demo context, not hardened for production.
- The optimizer binaries are **opaque** (compiled C++); this repo documents their I/O contract, not their internal algorithm.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the detailed data flow.
