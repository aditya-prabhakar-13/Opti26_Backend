# Optimization Engine

This document covers the "brain" of the platform: the native `velora_*` solver binaries, how the backend drives them, the constraint evaluator, and the dynamic-insertion flow.

## Overview

The actual route optimization is performed by **precompiled native C++ binaries** committed under `optimizer/executables/`. This repo does not contain their source — it documents their **I/O contract** and how Django orchestrates them. A separate Python module, `evaluator.py`, independently verifies each solution against the constraint set.

## The binaries

Six binaries per OS folder (`win/` `.exe`, `linux/`, `macos/`):

| Binary | Mode | Invocation | Purpose |
|--------|------|-----------|---------|
| `velora_final` | optimized | `exe <input.json> <output.json>` | Primary constraint-respecting solution. |
| `velora_noconstraints` | noconstraints | `exe <input.json> <output.json>` | Reference run with constraints relaxed (upper bound). |
| `velora_infeasiblehandling` | infeasible | `exe <input.json> <output.json>` | Handles otherwise-infeasible inputs gracefully. |
| `velora_final_dynamic` | optimized (dynamic) | `exe <solved.json> <new_employees.json>` → writes `updated_output.json` | Insert new employees into an existing optimized plan. |
| `velora_noconstraints_dynamic` | noconstraints (dynamic) | same | Dynamic variant of noconstraints. |
| `velora_infeasiblehandling_dynamic` | infeasible (dynamic) | same | Dynamic variant of infeasible handling. |

### I/O contract

**Standard binaries** take two path arguments — input JSON and output JSON — and write the solution to the output path. The backend then reads it back. Non-zero exit code or empty output file is treated as failure (fatal for `velora_final`, a warning/skip for the other two).

**Dynamic binaries** take the previously-solved output JSON and a `new_employee_data.json`, and write `updated_output.json` **in their working directory** (`cwd` is set to the temp dir).

### OS/path resolution

`optimizer/views.py → get_exe_path(name)`:
```python
subdir = "win" | "linux" | "macos"        # from os.name / platform.system()
exe    = f"{name}.exe" if os.name == "nt" else name
path   = optimizer/executables/<subdir>/<exe>
```
Raises `FileNotFoundError` if the resolved binary is absent.

### The "ALNS depth" knob

If the request includes `optimization_mode` (integer), it is injected into the parsed input as:
```json
"config": [ { "key": "alns_depth", "value": <mode> } ]
```
This tunes the solver's **Adaptive Large Neighborhood Search** depth — higher = more thorough search, slower runtime.

## Backend orchestration (`_execute_optimization`)

Standard flow, step by step (see `optimizer/views.py`):

1. **Validate** the upload is `.xlsx`.
2. **Temp files** — create temp `.xlsx` + input/output JSON paths via `tempfile` (nothing persisted to `results/`).
3. **Parse** Excel → dict (`parse_excel_to_dict`), serialize with `NpEncoder`.
4. **Run** `velora_final` → optimized output (fatal on failure).
5. **Run** `velora_noconstraints` (skipped with a warning if the binary is missing).
6. **Run** `velora_infeasiblehandling` (same guarding).
7. **Read** each output, guarding against missing/empty files.
8. **Evaluate** each result (`run_constraint_evaluation`).
9. **Persist** to the DB (auto-migrates if the table is missing).
10. **Return** results + metrics + evaluations.
11. **`finally`: delete** all temp files.

`stdout` of every binary is routed to `DEVNULL` (the C++ code is chatty and would rate-limit Railway logs); `stderr` is captured for error reporting.

Progress is reported at each stage through `report_progress(stage, pct, msg)` which updates the global `_current_progress` (polled via `/api/progress`).

## Dynamic insertion (`_execute_dynamic_optimization`)

Adds new employees to a **solved** case without recomputing from scratch. Key sub-steps:

1. **Extract** each mode's solved output from `testCaseData` (`_extract_mode_result` handles the various key names the frontend may use: `result`/`result_data`, `resultNoConstraints`/`result_noconstraints`, etc.).
2. **Consistency check** (`_is_solved_output_consistent`) — every employee referenced in `vehicles[].trips[].route`/`passengers` must exist in `input.employees`. Picks the first consistent mode as the `primary_input`.
3. **Auto-repair** (`_repair_solved_output_consistency`) — if no mode is consistent, backfill the missing employees (from the incoming payload, or with sensible defaults inferred from the office coords) so the dynamic binary has a coherent input. Logs which IDs were backfilled.
4. **Build** `new_employees_payload` (`_build_new_employees_payload`) — infers office `drop` coords from the first known employee; normalizes each new employee to the solver's schema.
5. **Run** `velora_*_dynamic` per mode with `[solved.json, new_employees.json]`, reading `updated_output.json`.
6. **Merge** new employees into each output (`_merge_new_employees_into_output`) — add to `input.employees`/`baseline`, mark as `unrouted_employees` if the solver didn't place them, and recompute `summary` counts.
7. **Evaluate** and **return** the same envelope as the standard flow.

This design makes the "add an employee" UX fast and resilient even when the stored test case is slightly inconsistent.

## Constraint Evaluator

Source: `optimizer/executables/evaluator.py`. It reads a solver output (which contains both `input` and the solution) and reports **constraint violations**. It is both importable (`from .executables.evaluator import evaluate`) and a standalone CLI (`python evaluator.py output.json [--json]`).

### Hard constraints (must never be violated → `passed = False` if any)

| ID | Name | Rule |
|----|------|------|
| **H1** | All Employees Routed | No employee left in `unrouted_employees`. |
| **H2** | Earliest Pickup | `pickup_time ≥ earliest_pickup`. |
| **H3** | Latest Drop | `drop_time ≤ latest_drop`. |
| **H4** | Vehicle Capacity | trip `load ≤ vehicle.capacity`. |
| **H5** | Employee Appears Once | No employee across multiple trips/vehicles. |
| **H6** | Employee-Vehicle Match | Every routed `employee_id` exists in `input.employees`. |

### Soft constraints (tracked as warnings, do not fail the run)

| ID | Name | Rule |
|----|------|------|
| **S1** | Vehicle Category Preference | `premium` employee → premium vehicle; `normal` employee → non-premium. |
| **S2** | Sharing Preference | `single`→load 1, `double`→≤2, `triple`→≤3. |
| **S3** | Priority Delay Budget | Drop delay vs `latest_drop` must be within `priority_N_max_delay_min` (from metadata). |
| **S4** | Cost vs Baseline | Aggregate optimized cost should not exceed baseline. |

### Evaluator internals

- `parse_time("HH:MM")` → minutes since midnight; `fmt_time` is the inverse. Times stored as day-fractions (0.0–1.0) are auto-normalized to `HH:MM`.
- `Violation` dataclass: `constraint_id`, `constraint_name`, `severity`, `employee_id`, `vehicle_id`, `trip_number`, `detail`.
- `EvaluationResult`: `.violations`, `.hard_violations`, `.soft_violations`, `.passed`, `.stats`.
- CLI printers: `print_report` (colored terminal report) and `print_json_report` (machine-readable). Exit code `0` if passed, `1` if any hard violation.

The API embeds each mode's `{ stats, violations }` under `evaluations` in the response; the frontend renders them in `ViolationsReport.jsx`.

## Route geometry (OSRM)

Not part of optimization per se, but engine-adjacent. Two OSRM uses:
- **Table service** (`utils.get_osrm_matrix`) during parsing → the distance matrix.
- **Route service** (`views._fetch_osrm`) at display time → road polylines, with full-route → per-segment-stitch → straight-line fallbacks and retry/backoff.

Both degrade gracefully when the public OSRM server is slow or down.
