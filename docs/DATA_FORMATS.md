# Data Formats

This document specifies the two most important data contracts in the system:
1. The **Excel input** workbook the user uploads.
2. The **JSON output** produced by the optimizer and returned by the API.

Source of truth: `optimizer/utils.py` (parsing) and the shapes consumed in `optimizer/views.py`, `evaluator.py`, and `frontend/src/lib/transform.js`.

---

## 1. Excel input format

The uploaded file must be a real `.xlsx` and contain **exactly these four sheets** (missing any → `400`/`500` error):

```
employees | vehicles | baseline | metadata
```

Parsing rules (from `parse_excel_to_dict`):
- Rows that are **completely empty** are dropped (`dropna(how='all')`).
- **Any remaining empty cell** in any of the four sheets → rejected with a precise message (`empty value found in '<sheet>' … at row R, column 'C'`).
- `NaN` values become `null` in JSON.

### Sheet: `employees`

Required columns (all must be present, no empties):

| Column | Type | Meaning |
|--------|------|---------|
| `employee_id` | string/int | Unique employee identifier. |
| `priority` | int | Priority tier (1 = highest). Used for delay budgets. |
| `pickup_lat` | float | Employee pickup latitude. |
| `pickup_lng` | float | Employee pickup longitude. |
| `drop_lat` | float | Drop (office) latitude. |
| `drop_lng` | float | Drop (office) longitude. |
| `earliest_pickup` | `HH:MM` | Earliest allowed pickup time. |
| `latest_drop` | `HH:MM` | Latest allowed drop time. |
| `vehicle_preference` | `premium`/`normal`/`any` | Preferred vehicle category (soft). |
| `sharing_preference` | `single`/`double`/`triple` | Max co-passengers preference (soft). |

> The **office location** is taken from the **first employee's** `drop_lat`/`drop_lng`.

### Sheet: `vehicles`

Free-form columns (passed through as records), but must include:

| Column | Type | Meaning |
|--------|------|---------|
| `avg_speed_kmph` | number > 0 | Vehicle average speed. **Validated:** must be numeric and > 0. |

Typical additional columns the solver/evaluator use: `vehicle_id`, `capacity`, `category` (`premium`/`normal`), `current_lat`, `current_lng`.

### Sheet: `baseline`

The company's current (pre-optimization) cost/time per employee. Typical columns:

| Column | Type | Meaning |
|--------|------|---------|
| `employee_id` | string/int | Links to `employees`. |
| `baseline_cost` | number | Current transport cost for this employee. |
| `baseline_time_min` | int | Current travel time (minutes). |

### Sheet: `metadata`

Key/value configuration passed to the solver/evaluator. Typical keys:

| Key | Meaning |
|-----|---------|
| `test_case_id` | Identifier used in evaluator reports. |
| `priority_1_max_delay_min` … `priority_5_max_delay_min` | Per-priority allowed delay budget (soft constraint S3). |

### Parsed JSON (what the solver actually receives)

`parse_excel_to_dict` produces:

```json
{
  "employees": {
    "E1": {
      "priority": 1,
      "pickup": { "lat": 12.96, "lng": 77.60 },
      "drop":   { "lat": 12.97, "lng": 77.59 },
      "earliest_pickup": "08:00",
      "latest_drop": "10:00",
      "vehicle_preference": "any",
      "sharing_preference": "triple",
      "distances": { "drop": 4200.0, "E2": 1500.0, "E3": 2600.0 }
    }
  },
  "vehicles":  [ { "vehicle_id": "V1", "capacity": 4, "avg_speed_kmph": 30, ... } ],
  "baseline":  [ { "employee_id": "E1", "baseline_cost": 320, "baseline_time_min": 45 } ],
  "metadata":  [ { "key": "test_case_id", "value": "TC01" }, ... ],
  "config":    [ { "key": "alns_depth", "value": 3 } ]   // only if optimization_mode was sent
}
```

The `distances` map per employee is a **road-distance-to-office (`drop`) plus inter-employee distances**, computed via the OSRM table service, or **haversine** fallback if OSRM is down. Distances are in **meters**, rounded to 1 decimal.

---

## 2. Optimizer JSON output

Each `velora_*` binary reads the input JSON and writes an output JSON. The output **echoes the input** (under `input`) and adds the solution. Consumed by `evaluator.py` and `frontend/src/lib/transform.js`.

```json
{
  "input": {
    "employees": { /* same shape as parsed input.employees */ },
    "vehicles":  [ /* echoed vehicle records */ ],
    "baseline":  [ { "employee_id": "E1", "baseline_cost": 320, "baseline_time_min": 45 } ],
    "metadata":  [ { "key": "...", "value": "..." } ]
  },
  "summary": {
    "total_employees":       18,
    "employees_routed":      18,
    "employees_unrouted":    0,
    "total_baseline_cost":   6100.0,
    "total_optimized_cost":  4200.0,
    "net_savings":           1900.0,
    "savings_percentage":    31.1
  },
  "vehicles": [
    {
      "vehicle_id": "V1",
      "category":   "normal",
      "capacity":   4,
      "trips": [
        {
          "trip_number":     1,
          "load":            3,
          "capacity_limit":  4,
          "start_time":      "08:10",
          "end_time":        "08:55",
          "trip_distance_km": 12.4,
          "route":  ["START", "E1", "E5", "E9", "END"],
          "passengers": [
            { "employee_id": "E1", "pickup_time": "08:12", "drop_time": "08:50" },
            { "employee_id": "E5", "pickup_time": "08:20", "drop_time": "08:52" },
            { "employee_id": "E9", "pickup_time": "08:31", "drop_time": "08:54" }
          ]
        }
      ]
    }
  ],
  "unrouted_employees": [
    { "employee_id": "E17", "reason": "No feasible vehicle within time window" }
  ]
}
```

### Field semantics

| Path | Meaning |
|------|---------|
| `input.*` | The full echoed input (so a result is self-contained for evaluation/re-display). |
| `summary.employees_routed / _unrouted` | Coverage counts. |
| `summary.total_baseline_cost / total_optimized_cost / net_savings / savings_percentage` | Cost comparison. |
| `vehicles[].category` | `premium` / `normal` — used by soft constraint S1. |
| `vehicles[].capacity` | Max passengers — hard constraint H4. |
| `trips[].route` | Ordered token list. `START` = vehicle origin, `END` = office, other tokens = `employee_id`s (pickup order). |
| `trips[].load` | Passengers on the trip. |
| `trips[].trip_distance_km` | Road distance for the trip (kilometers). |
| `trips[].start_time / end_time` | `HH:MM`. |
| `passengers[].pickup_time / drop_time` | `HH:MM` per employee. |
| `unrouted_employees[]` | Employees the solver could not place, with a reason (hard constraint H1). |

### How the frontend/backend derive metrics

`computed_metrics` (backend `_build_computed_metrics`, mirrored in `transform.js`):
- `total_distance_km` = Σ `trips[].trip_distance_km`.
- `optimized_travel_time_min` = Σ trip durations (`end_time − start_time`, wrapping past midnight).
- `baseline_travel_time_min` = Σ `input.baseline[].baseline_time_min`.
- The rest come straight from `summary`.

---

## 3. Dynamic-insertion payloads

**`new_employee_data.json`** (built by `_build_new_employees_payload`, written to a temp file for `velora_*_dynamic`):

```json
{
  "new_employees": {
    "E99": {
      "priority": 2,
      "pickup": { "lat": 12.9611, "lng": 77.6387 },
      "drop":   { "lat": 12.97, "lng": 77.59 },
      "earliest_pickup": "08:00",
      "latest_drop": "10:00",
      "vehicle_preference": "any",
      "sharing_preference": "triple",
      "baseline_cost": 320
    }
  }
}
```

The dynamic binary reads the previously-solved output + this file and writes `updated_output.json` (same output schema as above). See [OPTIMIZATION_ENGINE.md](./OPTIMIZATION_ENGINE.md).

---

## 4. Evaluator output

`evaluator.evaluate()` returns an `EvaluationResult` serialized in the API as:

```json
{
  "stats": {
    "test_case_id": "TC01",
    "total_employees": 18, "employees_routed": 18, "employees_unrouted": 0,
    "total_baseline_cost": 6100.0, "total_optimized_cost": 4200.0,
    "net_savings": 1900.0, "savings_pct": 31.1,
    "hard_violations": 0, "soft_violations": 2, "passed": true
  },
  "violations": [
    {
      "constraint_id": "S2", "constraint_name": "Sharing Preference", "severity": "SOFT",
      "employee_id": "E5", "vehicle_id": "V1", "trip_number": 1,
      "detail": "E5 has sharing_preference='double' (preferred max 2) but trip load is 3"
    }
  ]
}
```

Constraint IDs (H1–H6 hard, S1–S4 soft) are fully documented in [OPTIMIZATION_ENGINE.md](./OPTIMIZATION_ENGINE.md#constraint-evaluator).
