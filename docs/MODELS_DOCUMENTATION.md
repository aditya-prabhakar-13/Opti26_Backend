# Models & Database Documentation

The backend has a **single** Django model. Persistence is deliberately minimal — the heavy data (routes) is stored as JSON blobs.

Source: `optimizer/models.py`. Migrations: `optimizer/migrations/`.

## Model: `OptimizationResult`

```python
class OptimizationResult(models.Model):
    original_filename          = models.CharField(max_length=255)
    result_data                = models.JSONField()                    # velora_final output (optimized)
    result_data_noconstraints  = models.JSONField(null=True, blank=True)  # velora_noconstraints output
    result_data_infeasible     = models.JSONField(null=True, blank=True)  # velora_infeasiblehandling output
    created_at                 = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Result for {self.original_filename} ({self.created_at})"
```

### Field reference

| Field | Type | Null? | Description |
|-------|------|-------|-------------|
| `id` | BigAutoField (PK) | no | Auto primary key. |
| `original_filename` | CharField(255) | no | The uploaded Excel file's name (e.g. `TestCase_TC01.xlsx`). |
| `result_data` | JSONField | no | The **optimized** solver output (from `velora_final`). Full route/summary/input JSON — see [DATA_FORMATS.md](./DATA_FORMATS.md). |
| `result_data_noconstraints` | JSONField | yes | Output from `velora_noconstraints` (reference/upper-bound run). `null` if that binary was missing or crashed. |
| `result_data_infeasible` | JSONField | yes | Output from `velora_infeasiblehandling`. `null` if unavailable. |
| `created_at` | DateTimeField | no | Auto-set on creation (`auto_now_add=True`). Ordering key. |

### Why JSONField?

Each solver output is a deeply nested, variable-shape document (vehicles → trips → passengers, plus the echoed input and summary). Storing it as a single `JSONField` avoids modeling dozens of relational tables for what is essentially an immutable result document. Queries only ever fetch whole rows and never filter on nested fields, so JSON is the pragmatic choice.

### Computed vs. stored data

The model stores **raw solver output only**. Derived numbers (vehicles used, total distance, savings, travel time) are **computed on read** by `_build_computed_metrics()` in `views.py`, not stored. This keeps the row source-of-truth and lets metric formulas evolve without a migration.

## Database backend

Configured in `Opti26_Backend/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

- **Engine:** SQLite (`db.sqlite3` at the repo root).
- Suitable for the single-instance demo deployment. For production concurrency, switch `ENGINE`/`NAME` to Postgres (`django.db.backends.postgresql`) and re-run migrations.

## Migrations

| Migration | What it does |
|-----------|--------------|
| `0001_initial.py` | Creates `OptimizationResult` with `original_filename`, `result_data`, `created_at`. |
| `0002_optimizationresult_result_data_infeasible_and_more.py` | Adds the nullable `result_data_infeasible` and `result_data_noconstraints` JSON fields (when the three-mode design was introduced). |

Apply with:
```bash
python manage.py migrate
```

### Auto-bootstrap behavior

`views.py` guards against a missing table on first run. `_save_optimization_result()` catches `OperationalError`/`ProgrammingError` where the message indicates `optimizer_optimizationresult` is missing, calls `call_command('migrate', ...)`, and retries the insert. Read endpoints (`_safe_list_results`, `_safe_latest_result`, `api_result_detail`) treat the same missing-table error as "no data" (empty list / `null` / `404`) rather than crashing.

## Admin

`optimizer/admin.py` registers the model:

```python
@admin.register(OptimizationResult)
class OptimizationResultAdmin(admin.ModelAdmin):
    list_display = ('original_filename', 'created_at')
```

Browse at `/admin/` (create a superuser first: `python manage.py createsuperuser`).

## Serialization shape (`_serialize_result`)

When returned via the API, a row is serialized as:

```json
{
  "id": 12,
  "filename": "<original_filename>",
  "created_at": "<ISO 8601>",
  "computed_metrics": { /* derived, not stored */ },
  "result":               "<result_data>",
  "result_noconstraints": "<result_data_noconstraints>",
  "result_infeasible":    "<result_data_infeasible>"
}
```

## Relationship to browser localStorage

The **frontend** maintains its own list of "test cases" in `localStorage` (key `velora_testcases`), independent of this table. The DB is the backend's record; the frontend list is client-side and is what the Test Cases view renders. Deletes from the UI remove the localStorage entry and best-effort DELETE the DB row. See [ARCHITECTURE.md](./ARCHITECTURE.md#storage-model--two-places-two-purposes).
