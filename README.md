# Opti26 / Velora — Documentation Index

Welcome to the documentation for **Opti26 (Velora)**, a corporate mobility (employee cab pooling) optimization platform. This `docs/` folder explains **everything** about the project: what it does, how it is built, how the pieces talk to each other, how to install and run it, and how to deploy it.

> **TL;DR** — A Django backend accepts an Excel workbook describing employees, vehicles, baseline costs and metadata, feeds it to native C++ optimization executables (`velora_*`), evaluates the returned routes against hard/soft constraints, and serves the results as JSON to a React (Vite) web app and a Capacitor-wrapped Android app.

---

## Read in this order

| # | Document | What it covers |
|---|----------|----------------|
| 1 | [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | The problem, the product, the high-level solution, and the three sub-apps. |
| 2 | [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, request/response data flow, component diagram. |
| 3 | [APP_STRUCTURE.md](./APP_STRUCTURE.md) | Complete repository/directory tree with a description of every folder and file. |
| 4 | [QUICK_START.md](./QUICK_START.md) | Get everything running locally in the fewest possible steps. |
| 5 | [INSTALLATION.md](./INSTALLATION.md) | Detailed, platform-by-platform install instructions. |
| 6 | [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) | Environment variables, config, CORS, executables, tooling versions. |
| 7 | [API_REFERENCE.md](./API_REFERENCE.md) | Every HTTP endpoint: method, params, request/response bodies, errors. |
| 8 | [MODELS_DOCUMENTATION.md](./MODELS_DOCUMENTATION.md) | Django data model, database schema, migrations. |
| 9 | [DATA_FORMATS.md](./DATA_FORMATS.md) | The Excel input format and the optimization JSON output schema. |
| 10 | [OPTIMIZATION_ENGINE.md](./OPTIMIZATION_ENGINE.md) | The `velora_*` executables, constraint evaluator, dynamic insertion. |
| 11 | [FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md) | The React web app: components, state, map, PDF, route geometry. |
| 12 | [MOBILE_DOCUMENTATION.md](./MOBILE_DOCUMENTATION.md) | The Capacitor Android wrapper and how it is built. |
| 13 | [DEPLOYMENT.md](./DEPLOYMENT.md) | Docker, Railway (backend), Vercel (frontend), APK release. |
| 14 | [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Consolidated summary of design decisions and how it all fits together. |

---

## The 30-second mental model

```
 Excel (.xlsx)                     Native C++ optimizers                JSON result
┌────────────┐   parse   ┌──────────────────────────────────┐   read   ┌──────────┐
│ employees  │──────────▶│ velora_final            (default) │─────────▶│ vehicles │
│ vehicles   │  to JSON  │ velora_noconstraints    (upper)   │          │ trips    │
│ baseline   │           │ velora_infeasiblehandling (relaxed)│          │ summary  │
│ metadata   │           └──────────────────────────────────┘          └────┬─────┘
└────────────┘                                                                │
      ▲                                                                       ▼
      │                             evaluator.py  (H1–H6 hard, S1–S4 soft)
   React web / Android  ◀───────────  Django REST-ish JSON API  ◀───── SQLite DB
```

## Component summary

| Layer | Technology | Location |
|-------|-----------|----------|
| Backend | Django 6.0.2 (Python) | `Opti26_Backend/`, `optimizer/` |
| Optimizer | Native C++ binaries + Python evaluator | `optimizer/executables/` |
| Database | SQLite | `db.sqlite3` |
| Web frontend | React 18 + Vite 5 + Tailwind 4 + Leaflet | `frontend/` |
| Mobile | Capacitor 8 (Android) wrapping the web UI | `Opti26_mobile/` |
| Deployment | Docker + Gunicorn (Railway), Vercel, Gradle APK | `Dockerfile`, `frontend/`, `Opti26_mobile/android/` |

For anything not covered here, the source itself is small and readable — start at `optimizer/views.py` (backend orchestration) and `frontend/src/App.jsx` (UI orchestration).
