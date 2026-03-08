import os
import json
import copy
import subprocess
import tempfile
import requests
import time
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods
from django.core.management import call_command
from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone
from .models import OptimizationResult
from .utils import parse_excel_to_dict, NpEncoder
from .executables.evaluator import evaluate as run_constraint_evaluation

# Progress tracking storage (session-based for now)
_progress_store = {}
_current_progress = {'stage': 'idle', 'percentage': 0, 'message': ''}

def _debug_log_json_input(label, data):
    # Temporary debug logger: prints full JSON payload sent to executables.
    try:
        print(f"[DEBUG_JSON_INPUT_START] {label}")
        print(json.dumps(data, cls=NpEncoder, ensure_ascii=False, indent=2))
        print(f"[DEBUG_JSON_INPUT_END] {label}")
    except Exception as exc:
        print(f"[DEBUG_JSON_INPUT_ERROR] {label}: {exc}")

def _parse_optimization_mode(raw_value):
    if raw_value in (None, ''):
        return None
    try:
        return int(raw_value)
    except (TypeError, ValueError):
        raise ValueError("optimization_mode must be an integer")

def _hhmm_to_minutes(value):
    if not isinstance(value, str) or ':' not in value:
        return None
    parts = value.split(':')
    if len(parts) < 2:
        return None
    try:
        return int(parts[0]) * 60 + int(parts[1])
    except ValueError:
        return None

def _trip_duration_minutes(start_time, end_time):
    start = _hhmm_to_minutes(start_time)
    end = _hhmm_to_minutes(end_time)
    if start is None or end is None:
        return 0
    if end >= start:
        return end - start
    return (24 * 60 - start) + end

def _build_computed_metrics(result_data):
    vehicles = result_data.get('vehicles', [])
    summary = result_data.get('summary', {})
    baseline_rows = result_data.get('input', {}).get('baseline', [])

    total_distance_km = 0.0
    optimized_travel_time_min = 0
    for vehicle in vehicles:
        for trip in vehicle.get('trips', []):
            total_distance_km += float(trip.get('trip_distance_km', 0) or 0)
            optimized_travel_time_min += _trip_duration_minutes(
                trip.get('start_time'),
                trip.get('end_time'),
            )

    baseline_travel_time_min = sum(int(row.get('baseline_time_min', 0) or 0) for row in baseline_rows)

    return {
        'vehicles_used': len(vehicles),
        'employees_covered': int(summary.get('employees_routed', 0) or 0),
        'employees_unrouted': int(summary.get('employees_unrouted', 0) or 0),
        'total_distance_km': round(total_distance_km, 3),
        'total_cost': float(summary.get('total_optimized_cost', 0) or 0),
        'baseline_cost': float(summary.get('total_baseline_cost', 0) or 0),
        'net_savings': float(summary.get('net_savings', 0) or 0),
        'savings_percentage': float(summary.get('savings_percentage', 0) or 0),
        'optimized_travel_time_min': optimized_travel_time_min,
        'baseline_travel_time_min': baseline_travel_time_min,
    }

def _serialize_result(saved_result):
    return {
        'id': saved_result.id,
        'filename': saved_result.original_filename,
        'created_at': saved_result.created_at.isoformat(),
        'computed_metrics': _build_computed_metrics(saved_result.result_data),
        'result': saved_result.result_data,
        'result_noconstraints': saved_result.result_data_noconstraints,
        'result_infeasible': saved_result.result_data_infeasible,
    }

def _db_table_missing(error):
    return 'no such table' in str(error).lower() and 'optimizer_optimizationresult' in str(error).lower()

def _safe_list_results(limit=50):
    try:
        return list(OptimizationResult.objects.order_by('-created_at')[:limit])
    except (OperationalError, ProgrammingError) as exc:
        if _db_table_missing(exc):
            return []
        raise

def _safe_latest_result():
    try:
        return OptimizationResult.objects.order_by('-created_at').first()
    except (OperationalError, ProgrammingError) as exc:
        if _db_table_missing(exc):
            return None
        raise

def _save_optimization_result(filename, result_data, result_data_noconstraints=None, result_data_infeasible=None):
    try:
        return OptimizationResult.objects.create(
            original_filename=filename,
            result_data=result_data,
            result_data_noconstraints=result_data_noconstraints,
            result_data_infeasible=result_data_infeasible,
        )
    except (OperationalError, ProgrammingError) as exc:
        if not _db_table_missing(exc):
            raise

        # Bootstrap DB schema automatically for first-time local runs.
        call_command('migrate', interactive=False, verbosity=0)
        return OptimizationResult.objects.create(
            original_filename=filename,
            result_data=result_data,
            result_data_noconstraints=result_data_noconstraints,
            result_data_infeasible=result_data_infeasible,
        )

import os
import platform
from pathlib import Path

def get_exe_path(exe_name):
    # Add .exe on Windows
    exe_filename = f"{exe_name}.exe" if os.name == "nt" else exe_name

    # Determine OS folder
    if os.name == "nt":
        subdir = "win"
    elif os.name == "posix":
        if platform.system() == "Darwin":
            subdir = "macos"
        else:
            subdir = "linux"
    else:
        raise RuntimeError("Unsupported operating system")

    # Base directory (directory where this script is located)
    base_dir = Path(__file__).resolve().parent

    # Construct full path
    exe_path = base_dir / "executables" / subdir / exe_filename

    if not exe_path.exists():
        raise FileNotFoundError(f"Executable not found: {exe_path}")

    return str(exe_path)

def _extract_mode_result(test_case_data, mode):
    if mode == 'optimized':
        keys = ('result', 'result_data')
    elif mode == 'noconstraints':
        keys = ('resultNoConstraints', 'result_noconstraints', 'result_data_noconstraints')
    else:
        keys = ('resultInfeasible', 'result_infeasible', 'result_data_infeasible')

    for key in keys:
        value = test_case_data.get(key)
        if value:
            return value
    return None

def _collect_route_employee_ids(solved_output):
    ids = set()
    for vehicle in solved_output.get('vehicles', []) or []:
        for trip in vehicle.get('trips', []) or []:
            for pax in trip.get('passengers', []) or []:
                employee_id = pax.get('employee_id')
                if employee_id:
                    ids.add(str(employee_id))
            for token in trip.get('route', []) or []:
                token_str = str(token)
                if token_str not in ('START', 'END'):
                    ids.add(token_str)
    return ids

def _is_solved_output_consistent(solved_output):
    input_employees = solved_output.get('input', {}).get('employees', {}) or {}
    if not isinstance(input_employees, dict) or not input_employees:
        return False, "missing input.employees"

    route_ids = _collect_route_employee_ids(solved_output)
    missing = sorted(eid for eid in route_ids if eid not in input_employees)
    if missing:
        preview = ", ".join(missing[:5])
        return False, f"unknown employees in routes: {preview}"
    return True, None

def _repair_solved_output_consistency(solved_output, new_employees):
    repaired = copy.deepcopy(solved_output)
    input_block = repaired.setdefault('input', {})
    employees = input_block.setdefault('employees', {})
    baseline = input_block.setdefault('baseline', [])
    if not isinstance(employees, dict):
        employees = {}
        input_block['employees'] = employees
    if not isinstance(baseline, list):
        baseline = []
        input_block['baseline'] = baseline

    missing_ids = sorted(eid for eid in _collect_route_employee_ids(repaired) if eid not in employees)
    if not missing_ids:
        return repaired, []

    # Build lookup from incoming new employees (frontend payload)
    incoming_by_id = {}
    for item in new_employees or []:
        if isinstance(item, dict):
            key = str(item.get('id', '')).strip()
            if key:
                incoming_by_id[key] = item

    # Infer office coords from first known employee
    office_lat, office_lng = 0.0, 0.0
    if employees:
        first = next(iter(employees.values()))
        drop = first.get('drop', {}) if isinstance(first, dict) else {}
        office_lat = float(drop.get('lat', 0.0) or 0.0)
        office_lng = float(drop.get('lng', 0.0) or 0.0)

    # Backfill missing employees with best-available data.
    for eid in missing_ids:
        item = incoming_by_id.get(eid)
        if item:
            pickup_lat = float(item.get('lat', office_lat) or office_lat)
            pickup_lng = float(item.get('lng', office_lng) or office_lng)
            priority = int(item.get('priority', 3) or 3)
            earliest_pickup = item.get('earliest_pickup') or '08:00'
            latest_drop = item.get('latest_drop') or '10:00'
            vehicle_pref = item.get('vehicle_preference') or 'any'
            sharing_pref = item.get('sharing_preference') or 'triple'
            baseline_cost = float(item.get('baseline_cost', 0) or 0)
        else:
            # Fallback if no source data exists in payload.
            pickup_lat = office_lat
            pickup_lng = office_lng
            priority = 3
            earliest_pickup = '08:00'
            latest_drop = '10:00'
            vehicle_pref = 'any'
            sharing_pref = 'triple'
            baseline_cost = 0.0

        employees[eid] = {
            'priority': priority,
            'pickup': {'lat': pickup_lat, 'lng': pickup_lng},
            'drop': {'lat': office_lat, 'lng': office_lng},
            'earliest_pickup': earliest_pickup,
            'latest_drop': latest_drop,
            'vehicle_preference': vehicle_pref,
            'sharing_preference': sharing_pref,
            'distances': {'drop': 0.0},
        }

        baseline.append({
            'employee_id': eid,
            'baseline_cost': baseline_cost,
            'baseline_time_min': 0,
        })

    # Ensure distances dict contains keys for all employees (zero-filled fallback).
    all_ids = list(employees.keys())
    for emp_id, emp_data in employees.items():
        distances = emp_data.setdefault('distances', {})
        if not isinstance(distances, dict):
            distances = {}
            emp_data['distances'] = distances
        distances.setdefault('drop', 0.0)
        for other_id in all_ids:
            if other_id != emp_id:
                distances.setdefault(other_id, 0.0)

    return repaired, missing_ids

def _merge_new_employees_into_output(output_data, new_employees_payload):
    if not output_data or not isinstance(output_data, dict):
        return output_data

    new_map = (new_employees_payload or {}).get('new_employees', {}) or {}
    if not new_map:
        return output_data

    result = copy.deepcopy(output_data)
    input_block = result.setdefault('input', {})
    employees = input_block.setdefault('employees', {})
    baseline = input_block.setdefault('baseline', [])
    if not isinstance(employees, dict):
        employees = {}
        input_block['employees'] = employees
    if not isinstance(baseline, list):
        baseline = []
        input_block['baseline'] = baseline

    existing_baseline_ids = {str(row.get('employee_id')) for row in baseline if isinstance(row, dict)}
    existing_route_ids = _collect_route_employee_ids(result)
    unrouted = result.get('unrouted_employees') or []
    if not isinstance(unrouted, list):
        unrouted = []
    existing_unrouted_ids = {str(item.get('employee_id')) for item in unrouted if isinstance(item, dict)}

    for employee_id, item in new_map.items():
        if employee_id not in employees:
            pickup = item.get('pickup', {}) or {}
            drop = item.get('drop', {}) or {}
            employees[employee_id] = {
                'priority': int(item.get('priority', 3) or 3),
                'pickup': {
                    'lat': float(pickup.get('lat', 0.0) or 0.0),
                    'lng': float(pickup.get('lng', 0.0) or 0.0),
                },
                'drop': {
                    'lat': float(drop.get('lat', 0.0) or 0.0),
                    'lng': float(drop.get('lng', 0.0) or 0.0),
                },
                'earliest_pickup': item.get('earliest_pickup') or '08:00',
                'latest_drop': item.get('latest_drop') or '10:00',
                'vehicle_preference': item.get('vehicle_preference') or 'any',
                'sharing_preference': item.get('sharing_preference') or 'triple',
                'distances': {'drop': 0.0},
            }

        if employee_id not in existing_baseline_ids:
            baseline.append({
                'employee_id': employee_id,
                'baseline_cost': float(item.get('baseline_cost', 0) or 0),
                'baseline_time_min': 0,
            })

        # If not present in any route and not already explicitly unrouted, mark unrouted.
        if employee_id not in existing_route_ids and employee_id not in existing_unrouted_ids:
            unrouted.append({
                'employee_id': employee_id,
                'reason': 'Not inserted into any route by dynamic optimizer',
            })
            existing_unrouted_ids.add(employee_id)

    # Keep distances dictionary complete (zero fallback for missing pairs).
    all_ids = list(employees.keys())
    for emp_id, emp_data in employees.items():
        distances = emp_data.setdefault('distances', {})
        if not isinstance(distances, dict):
            distances = {}
            emp_data['distances'] = distances
        distances.setdefault('drop', 0.0)
        for other_id in all_ids:
            if other_id != emp_id:
                distances.setdefault(other_id, 0.0)

    result['unrouted_employees'] = unrouted
    summary = result.setdefault('summary', {})
    if isinstance(summary, dict):
        total = len(employees)
        unrouted_count = len(unrouted)
        summary['total_employees'] = total
        summary['employees_unrouted'] = unrouted_count
        summary['employees_routed'] = max(0, total - unrouted_count)

    return result

def _build_new_employees_payload(base_result, new_employees):
    employees = base_result.get('input', {}).get('employees', {})
    if not employees:
        raise ValueError("Selected testcase does not contain input employees")

    first_emp = next(iter(employees.values()))
    drop = first_emp.get('drop', {})
    drop_lat = drop.get('lat')
    drop_lng = drop.get('lng')
    if drop_lat is None or drop_lng is None:
        raise ValueError("Could not infer office drop coordinates from testcase")

    payload = {'new_employees': {}}

    # Accept both:
    # 1) frontend array format: [{id, ...}, ...]
    # 2) direct dynamic format: {"new_employees": {"E11": {...}}}
    if isinstance(new_employees, dict) and isinstance(new_employees.get('new_employees'), dict):
        iterable = []
        for employee_id, data in new_employees['new_employees'].items():
            item = dict(data or {})
            item['id'] = employee_id
            item.setdefault('lat', ((item.get('pickup') or {}).get('lat')))
            item.setdefault('lng', ((item.get('pickup') or {}).get('lng')))
            iterable.append(item)
    elif isinstance(new_employees, list):
        iterable = new_employees
    else:
        raise ValueError("newEmployees must be an array or an object with new_employees")

    for item in iterable:
        employee_id = str(item.get('id', '')).strip()
        if not employee_id:
            raise ValueError("Each new employee must include a non-empty id")

        try:
            payload['new_employees'][employee_id] = {
                'priority': int(item.get('priority', 3)),
                'pickup': {
                    'lat': float(item.get('lat')),
                    'lng': float(item.get('lng')),
                },
                'drop': {
                    'lat': float(drop_lat),
                    'lng': float(drop_lng),
                },
                'earliest_pickup': item.get('earliest_pickup'),
                'latest_drop': item.get('latest_drop'),
                'vehicle_preference': item.get('vehicle_preference', 'any'),
                'sharing_preference': item.get('sharing_preference', 'triple'),
                'baseline_cost': float(item.get('baseline_cost', 0)),
            }
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid numeric values for employee {employee_id}") from exc

    return payload

def _execute_dynamic_optimization(test_case_data, new_employees, progress_callback=None):
    if not isinstance(test_case_data, dict):
        raise ValueError("testCaseData must be an object")
    if not new_employees:
        raise ValueError("newEmployees is required")

    raw_inputs_by_mode = {
        'optimized': _extract_mode_result(test_case_data, 'optimized'),
        'noconstraints': _extract_mode_result(test_case_data, 'noconstraints'),
        'infeasible': _extract_mode_result(test_case_data, 'infeasible'),
    }

    consistency = {}
    for mode, data in raw_inputs_by_mode.items():
        if data is None:
            consistency[mode] = (False, "missing solved output")
            continue
        consistency[mode] = _is_solved_output_consistent(data)

    primary_input = None
    for mode in ('optimized', 'noconstraints', 'infeasible'):
        ok, _ = consistency.get(mode, (False, None))
        if ok:
            primary_input = raw_inputs_by_mode[mode]
            break

    if primary_input is None:
        # Attempt auto-repair: backfill employees missing from route/passenger IDs.
        repaired_inputs = {}
        repaired_consistency = {}
        repaired_notes = {}
        for mode, data in raw_inputs_by_mode.items():
            if data is None:
                repaired_inputs[mode] = None
                repaired_consistency[mode] = (False, "missing solved output")
                continue
            repaired_data, inserted_ids = _repair_solved_output_consistency(data, new_employees)
            repaired_inputs[mode] = repaired_data
            repaired_consistency[mode] = _is_solved_output_consistent(repaired_data)
            repaired_notes[mode] = inserted_ids

        raw_inputs_by_mode = repaired_inputs
        consistency = repaired_consistency

        for mode in ('optimized', 'noconstraints', 'infeasible'):
            ok, _ = consistency.get(mode, (False, None))
            if ok:
                primary_input = raw_inputs_by_mode[mode]
                inserted = repaired_notes.get(mode) or []
                if inserted:
                    print(f"[DYNAMIC] Auto-repaired {mode} input by backfilling employees: {', '.join(inserted)}")
                break

    if primary_input is None:
        problems = "; ".join(
            f"{mode}: {reason}"
            for mode, (ok, reason) in consistency.items()
            if not ok
        )
        raise ValueError(f"No consistent solved output found in testcase data ({problems})")

    inputs_by_mode = {}
    for mode in ('optimized', 'noconstraints', 'infeasible'):
        mode_input = raw_inputs_by_mode.get(mode)
        ok, _ = consistency.get(mode, (False, None))
        inputs_by_mode[mode] = mode_input if ok else primary_input
    exe_by_mode = {
        'optimized': 'velora_final_dynamic',
        'noconstraints': 'velora_noconstraints_dynamic',
        'infeasible': 'velora_infeasiblehandling_dynamic',
    }

    if progress_callback:
        progress_callback({'stage': 'setup', 'percentage': 5, 'message': 'Preparing dynamic optimization input...'})

    new_employees_payload = _build_new_employees_payload(primary_input, new_employees)

    outputs = {}
    reports = {
        'report_optimized': None,
        'report_noconstraints': None,
        'report_infeasible': None,
    }

    with tempfile.TemporaryDirectory() as tmp_dir:
        new_employees_path = os.path.join(tmp_dir, 'new_employee_data.json')
        with open(new_employees_path, 'w', encoding='utf-8') as f:
            json.dump(new_employees_payload, f, cls=NpEncoder)
        _debug_log_json_input("dynamic_new_employees_payload", new_employees_payload)

        mode_order = [('optimized', 30), ('noconstraints', 55), ('infeasible', 75)]
        for mode, pct in mode_order:
            mode_input = inputs_by_mode.get(mode)
            if mode_input is None:
                outputs[mode] = None
                continue

            solved_path = os.path.join(tmp_dir, f'{mode}_solved.json')
            with open(solved_path, 'w', encoding='utf-8') as f:
                json.dump(mode_input, f, cls=NpEncoder)
            _debug_log_json_input(f"dynamic_{mode}_solved_input", mode_input)

            if progress_callback:
                progress_callback({
                    'stage': 'optimizing',
                    'percentage': pct,
                    'message': f'Running dynamic {mode} optimization...',
                })

            exe_path = get_exe_path(exe_by_mode[mode])
            result = subprocess.run(
                [exe_path, solved_path, new_employees_path],
                capture_output=True,
                text=True,
                cwd=tmp_dir,
            )

            report_key = 'report_optimized' if mode == 'optimized' else (
                'report_noconstraints' if mode == 'noconstraints' else 'report_infeasible'
            )
            reports[report_key] = result.stdout

            if result.returncode != 0:
                if mode == 'optimized':
                    raise RuntimeError(result.stderr or result.stdout or "Dynamic optimized run failed")
                outputs[mode] = None
                continue

            updated_output_path = os.path.join(tmp_dir, 'updated_output.json')
            if not os.path.exists(updated_output_path):
                if mode == 'optimized':
                    raise RuntimeError("Dynamic optimized run did not produce updated_output.json")
                outputs[mode] = None
                continue

            with open(updated_output_path, 'r', encoding='utf-8') as f:
                mode_output = json.load(f)
                outputs[mode] = _merge_new_employees_into_output(mode_output, new_employees_payload)

    if progress_callback:
        progress_callback({'stage': 'evaluating', 'percentage': 85, 'message': 'Evaluating dynamic results...'})

    evaluations = {}
    for label, data in outputs.items():
        if data is None:
            evaluations[label] = None
            continue
        try:
            eval_result = run_constraint_evaluation(data)
            evaluations[label] = {
                'stats': eval_result.stats,
                'violations': [
                    {
                        'constraint_id': v.constraint_id,
                        'constraint_name': v.constraint_name,
                        'severity': v.severity,
                        'employee_id': v.employee_id,
                        'vehicle_id': v.vehicle_id,
                        'trip_number': v.trip_number,
                        'detail': v.detail,
                    }
                    for v in eval_result.violations
                ],
            }
        except Exception:
            evaluations[label] = None

    if progress_callback:
        progress_callback({'stage': 'processing', 'percentage': 92, 'message': 'Preparing dynamic response...'})

    filename = test_case_data.get('filename') or test_case_data.get('original_filename') or 'dynamic_case.json'
    optimized_result = outputs.get('optimized') or _merge_new_employees_into_output(primary_input, new_employees_payload)
    response_data = {
        'id': test_case_data.get('id'),
        'filename': filename,
        'created_at': test_case_data.get('created_at') or test_case_data.get('createdAt') or timezone.now().isoformat(),
        'computed_metrics': _build_computed_metrics(optimized_result),
        'result': optimized_result,
        'result_noconstraints': outputs.get('noconstraints'),
        'result_infeasible': outputs.get('infeasible'),
    }

    if progress_callback:
        progress_callback({'stage': 'complete', 'percentage': 100, 'message': 'Dynamic optimization complete!'})

    return response_data, reports, evaluations


def _execute_optimization(excel_file, progress_callback=None, optimization_mode=None):
    if not excel_file.name.lower().endswith('.xlsx'):
        raise ValueError("Only .xlsx files are supported")

    def report_progress(stage, percentage, message=""):
        log_msg = f"[{stage.upper()}:{percentage}%] {message}"
        print(log_msg)
        if progress_callback:
            progress_callback({
                'stage': stage,
                'percentage': min(100, max(0, percentage)),
                'message': message
            })

    try:
        # 1. Setup temporary files (no persistent storage)
        report_progress('setup', 5, 'Setting up temporary files...')
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_excel:
            for chunk in excel_file.chunks():
                tmp_excel.write(chunk)
            tmp_excel_path = tmp_excel.name

        # Create temporary JSON file paths (in system temp directory, not results/)
        with tempfile.NamedTemporaryFile(delete=False, suffix='_in.json', mode='w') as tmp_in:
            input_json_path = tmp_in.name
        with tempfile.NamedTemporaryFile(delete=False, suffix='_out.json') as tmp_out:
            output_json_path = tmp_out.name
        with tempfile.NamedTemporaryFile(delete=False, suffix='_out_noconstraints.json') as tmp_noconst:
            output_json_path_noconstraints = tmp_noconst.name
        with tempfile.NamedTemporaryFile(delete=False, suffix='_out_infeasible.json') as tmp_inf:
            output_json_path_infeasible = tmp_inf.name

        # 2. Parse Excel to Dictionary and save as temporary input JSON
        report_progress('parsing', 20, 'Parsing Excel sheets...')
        parsed_data = parse_excel_to_dict(
            tmp_excel_path,
            optimization_mode=optimization_mode,
        )
        
        report_progress('parsing', 28, 'Serializing to JSON...')
        with open(input_json_path, 'w') as f:
            json.dump(parsed_data, f, cls=NpEncoder)
        _debug_log_json_input("optimize_excel_input", parsed_data)
        print(f"[DEBUG] Created temporary input JSON: {input_json_path}")

        # 4. Run velora_final.exe with explicit input and output arguments
        report_progress('routing', 35, 'Calculating road distances with OSMnx...')
        exe_path = get_exe_path("velora_final")
        
        report_progress('optimizing', 40, 'Running optimized routes algorithm...')
        print(f"[DEBUG] Executing: {exe_path} {input_json_path} {output_json_path}")
        result = subprocess.run(
            [exe_path, input_json_path, output_json_path],
            capture_output=True,
            text=True
        )
        report_optimized = result.stdout
        print(f"[STDOUT] {result.stdout}")
        if result.returncode != 0:
            print(f"[STDERR] {result.stderr}")
            raise RuntimeError(f"Optimizer failed with code {result.returncode}: {result.stderr or result.stdout}")
        print("[SUCCESS] Optimized routes algorithm completed")

        # 4. Run velora_noconstraints.exe
        report_progress('optimizing', 55, 'Running no constraints algorithm...')
        exe_path_noconstraints = get_exe_path("velora_noconstraints")
        report_noconstraints = None
        if os.path.exists(exe_path_noconstraints):
            print(f"[DEBUG] Executing: {exe_path_noconstraints} {input_json_path} {output_json_path_noconstraints}")
            result_noconstraints = subprocess.run(
                [exe_path_noconstraints, input_json_path, output_json_path_noconstraints],
                capture_output=True,
                text=True
            )
            report_noconstraints = result_noconstraints.stdout
            print(f"[STDOUT] {result_noconstraints.stdout}")
            if result_noconstraints.returncode != 0:
                print(f"[WARNING] No constraints optimizer failed: {result_noconstraints.stderr}")
            else:
                print("[SUCCESS] No constraints algorithm completed")
        else:
            print("[WARNING] velora_noconstraints.exe not found, skipping")

        # 5. Run velora_infeasiblehandling.exe
        report_progress('optimizing', 65, 'Running infeasible handling algorithm...')
        exe_path_infeasible = get_exe_path("velora_infeasiblehandling")
        report_infeasible = None
        if os.path.exists(exe_path_infeasible):
            print(f"[DEBUG] Executing: {exe_path_infeasible} {input_json_path} {output_json_path_infeasible}")
            result_infeasible = subprocess.run(
                [exe_path_infeasible, input_json_path, output_json_path_infeasible],
                capture_output=True,
                text=True
            )
            report_infeasible = result_infeasible.stdout
            print(f"[STDOUT] {result_infeasible.stdout}")
            if result_infeasible.returncode != 0:
                print(f"[WARNING] Infeasible handling optimizer failed: {result_infeasible.stderr}")
            else:
                print("[SUCCESS] Infeasible handling algorithm completed")
        else:
            print("[WARNING] velora_infeasiblehandling.exe not found, skipping")

        # 6. Check if the output files were created and read them
        report_progress('processing', 70, 'Processing optimization results...')
        if not os.path.exists(output_json_path):
            raise RuntimeError(f"Output file not created. CLI Output: {result.stdout}")
        
        print(f"[DEBUG] Reading output JSON: {output_json_path}")
        with open(output_json_path, 'r') as f:
            final_data = json.load(f)
        print(f"[DEBUG] Loaded final_data with {len(final_data.get('vehicles', []))} vehicles")

        # Read additional results if they exist
        final_data_noconstraints = None
        if os.path.exists(output_json_path_noconstraints):
            print(f"[DEBUG] Reading no constraints result: {output_json_path_noconstraints}")
            with open(output_json_path_noconstraints, 'r') as f:
                final_data_noconstraints = json.load(f)
            print(f"[DEBUG] Loaded no constraints data with {len(final_data_noconstraints.get('vehicles', []))} vehicles")

        final_data_infeasible = None
        if os.path.exists(output_json_path_infeasible):
            print(f"[DEBUG] Reading infeasible result: {output_json_path_infeasible}")
            with open(output_json_path_infeasible, 'r') as f:
                final_data_infeasible = json.load(f)
            print(f"[DEBUG] Loaded infeasible data with {len(final_data_infeasible.get('vehicles', []))} vehicles")

        # 7. Run constraint evaluator on each output
        report_progress('evaluating', 80, 'Running constraint evaluator...')
        evaluations = {}
        for label, data in [
            ('optimized', final_data),
            ('noconstraints', final_data_noconstraints),
            ('infeasible', final_data_infeasible),
        ]:
            if data is None:
                evaluations[label] = None
                continue
            try:
                eval_result = run_constraint_evaluation(data)
                evaluations[label] = {
                    'stats': eval_result.stats,
                    'violations': [
                        {
                            'constraint_id': v.constraint_id,
                            'constraint_name': v.constraint_name,
                            'severity': v.severity,
                            'employee_id': v.employee_id,
                            'vehicle_id': v.vehicle_id,
                            'trip_number': v.trip_number,
                            'detail': v.detail,
                        }
                        for v in eval_result.violations
                    ],
                }
                print(f"[EVALUATOR] {label}: passed={eval_result.passed}, "
                      f"hard={eval_result.stats['hard_violations']}, "
                      f"soft={eval_result.stats['soft_violations']}")
            except Exception as eval_err:
                print(f"[WARNING] Evaluator failed for {label}: {eval_err}")
                evaluations[label] = None

        # 8. Save the structured JSON data to the database
        report_progress('saving', 90, 'Saving to database...')
        saved_result = _save_optimization_result(
            excel_file.name, 
            final_data,
            final_data_noconstraints,
            final_data_infeasible
        )
        print(f"[SUCCESS] Saved optimization result to database with ID: {saved_result.id}")
        
        report_progress('complete', 100, 'Optimization complete!')
        return saved_result, final_data, {
            'report_optimized': report_optimized,
            'report_noconstraints': report_noconstraints,
            'report_infeasible': report_infeasible,
        }, evaluations
    finally:
        # 8. Cleanup ALL temporary files immediately
        print("[CLEANUP] Removing all temporary files...")
        for path in [tmp_excel_path, input_json_path, output_json_path, 
                     output_json_path_noconstraints, output_json_path_infeasible]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                    print(f"[CLEANUP] Removed: {path}")
                except Exception as e:
                    print(f"[WARNING] Failed to remove {path}: {str(e)}")

def run_optimization(request):
    if request.method == 'POST' and request.FILES.get('excel_file'):
        excel_file = request.FILES['excel_file']
        try:
            optimization_mode = _parse_optimization_mode(request.POST.get('optimization_mode'))
            _execute_optimization(excel_file, optimization_mode=optimization_mode)
            return HttpResponse("Optimization complete! Result saved to database.")
        except Exception as e:
            return HttpResponse(f"System Error: {str(e)}", status=500)

    return render(request, 'optimizer/upload.html')

@csrf_exempt
def api_optimize(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    excel_file = request.FILES.get('excel_file')
    if not excel_file:
        return JsonResponse({'error': 'No excel_file provided'}, status=400)
    try:
        optimization_mode = _parse_optimization_mode(request.POST.get('optimization_mode'))
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)

    global _current_progress
    _current_progress = {'stage': 'starting', 'percentage': 0, 'message': 'Starting optimization...'}

    try:
        def progress_callback(progress):
            global _current_progress
            _current_progress = progress
        
        saved_result, _, reports, evaluations = _execute_optimization(
            excel_file,
            progress_callback=progress_callback,
            optimization_mode=optimization_mode,
        )
        
        # Mark as complete
        _current_progress = {'stage': 'complete', 'percentage': 100, 'message': 'Optimization complete!'}
        
        # Include the text-based reports and constraint evaluations in the response
        response_data = _serialize_result(saved_result)
        response_data['reports'] = reports
        response_data['evaluations'] = evaluations
        return JsonResponse(response_data, encoder=NpEncoder)
    except Exception as e:
        # Mark as failed
        _current_progress = {'stage': 'error', 'percentage': 0, 'message': str(e)}
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def api_optimize_dynamic(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON payload'}, status=400)

    test_case_data = payload.get('testCaseData')
    new_employees = payload.get('newEmployees')

    global _current_progress
    _current_progress = {'stage': 'starting', 'percentage': 0, 'message': 'Starting dynamic optimization...'}

    try:
        def progress_callback(progress):
            global _current_progress
            _current_progress = progress

        response_data, reports, evaluations = _execute_dynamic_optimization(
            test_case_data=test_case_data,
            new_employees=new_employees,
            progress_callback=progress_callback,
        )
        _current_progress = {'stage': 'complete', 'percentage': 100, 'message': 'Dynamic optimization complete!'}

        response_data['reports'] = reports
        response_data['evaluations'] = evaluations
        return JsonResponse(response_data, encoder=NpEncoder)
    except Exception as e:
        _current_progress = {'stage': 'error', 'percentage': 0, 'message': str(e)}
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_GET
def api_progress(request):
    """Get the current progress of optimization"""
    global _current_progress
    return JsonResponse(_current_progress)

@require_GET
def api_results(request):
    rows = _safe_list_results(limit=50)
    return JsonResponse(
        {
            'results': [
                {
                    'id': row.id,
                    'filename': row.original_filename,
                    'created_at': row.created_at.isoformat(),
                    'computed_metrics': _build_computed_metrics(row.result_data),
                }
                for row in rows
            ]
        },
        encoder=NpEncoder,
    )

@csrf_exempt
@require_http_methods(["GET", "DELETE"])
def api_result_detail(request, result_id):
    try:
        row = OptimizationResult.objects.get(pk=result_id)
    except OptimizationResult.DoesNotExist:
        return JsonResponse({'error': 'Result not found'}, status=404)
    except (OperationalError, ProgrammingError) as exc:
        if _db_table_missing(exc):
            return JsonResponse({'error': 'Result not found'}, status=404)
        raise

    if request.method == 'DELETE':
        row.delete()
        return JsonResponse({'ok': True, 'deleted_id': result_id})

    return JsonResponse(_serialize_result(row), encoder=NpEncoder)

def api_latest_result(request):
    latest = _safe_latest_result()
    if not latest:
        return JsonResponse({'result': None})

    return JsonResponse(_serialize_result(latest), encoder=NpEncoder)

@require_GET
def api_route_geometry(request):
    coordinates = request.GET.get('coordinates', '').strip()
    if not coordinates:
        return JsonResponse({'error': 'Missing coordinates query parameter'}, status=400)

    points = []
    for token in coordinates.split(';'):
        parts = token.split(',')
        if len(parts) != 2:
            return JsonResponse({'error': 'Invalid coordinate format'}, status=400)
        try:
            lng = float(parts[0])
            lat = float(parts[1])
        except ValueError:
            return JsonResponse({'error': 'Invalid numeric coordinates'}, status=400)
        points.append((lat, lng))

    if len(points) < 2:
        return JsonResponse({'error': 'At least two coordinates are required'}, status=400)

    def _fetch_osrm(coords: str, timeout_sec=25, max_retries=3):
        """Fetch route geometry from OSRM with retry logic"""
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson&steps=false"
        
        for attempt in range(max_retries):
            try:
                response = requests.get(osrm_url, timeout=timeout_sec)
                payload = response.json() if response.ok else {}
                routes = payload.get('routes', [])
                if routes and routes[0].get('geometry', {}).get('coordinates'):
                    return routes[0]['geometry']['coordinates']
                if not response.ok:
                    print(f"[OSRM] Status {response.status_code} for coords: {coords[:50]}...")
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt  # Exponential backoff
                        time.sleep(wait_time)
                        continue
            except requests.Timeout:
                print(f"[OSRM] Timeout on attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
            except Exception as e:
                print(f"[OSRM] Error: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
        
        return None

    try:
        full_geometry = _fetch_osrm(coordinates)
        if full_geometry:
            return JsonResponse(
                {
                    'coordinates': [[coord[1], coord[0]] for coord in full_geometry],
                    'source': 'osrm',
                },
                encoder=NpEncoder,
            )
    except Exception as e:
        print(f"[OSRM Full] Exception: {str(e)}")
        pass

    stitched = []
    osrm_segment_count = 0
    for index in range(len(points) - 1):
        start_lng = points[index][1]
        start_lat = points[index][0]
        end_lng = points[index + 1][1]
        end_lat = points[index + 1][0]
        pair_coords = f"{start_lng},{start_lat};{end_lng},{end_lat}"

        try:
            segment = _fetch_osrm(pair_coords, timeout_sec=15, max_retries=2)
            if segment:
                segment_lat_lng = [[coord[1], coord[0]] for coord in segment]
                if stitched and segment_lat_lng:
                    segment_lat_lng = segment_lat_lng[1:]
                stitched.extend(segment_lat_lng)
                osrm_segment_count += 1
                continue
        except Exception as e:
            print(f"[OSRM Segment] Error on segment {index}: {str(e)}")
            pass

        fallback_leg = [[points[index][0], points[index][1]], [points[index + 1][0], points[index + 1][1]]]
        if stitched:
            fallback_leg = fallback_leg[1:]
        stitched.extend(fallback_leg)

    if stitched:
        return JsonResponse(
            {
                'coordinates': stitched,
                'source': 'osrm-segmented' if osrm_segment_count > 0 else 'fallback',
            },
            encoder=NpEncoder,
        )

    return JsonResponse(
        {
            'coordinates': [[lat, lng] for lat, lng in points],
            'source': 'fallback',
        },
        encoder=NpEncoder,
    )
