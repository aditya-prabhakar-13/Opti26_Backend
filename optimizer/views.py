import os
import json
import subprocess
import tempfile
import requests
import time
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods
from django.core.management import call_command
from django.db.utils import OperationalError, ProgrammingError
from .models import OptimizationResult
from .utils import parse_excel_to_dict, NpEncoder
from .executables.evaluator import evaluate as run_constraint_evaluation

# Progress tracking storage (session-based for now)
_progress_store = {}
_current_progress = {'stage': 'idle', 'percentage': 0, 'message': ''}

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


def _execute_optimization(excel_file, progress_callback=None):
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
        parsed_data = parse_excel_to_dict(tmp_excel_path)
        
        report_progress('parsing', 28, 'Serializing to JSON...')
        with open(input_json_path, 'w') as f:
            json.dump(parsed_data, f, cls=NpEncoder)
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
            _execute_optimization(excel_file)
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

    global _current_progress
    _current_progress = {'stage': 'starting', 'percentage': 0, 'message': 'Starting optimization...'}

    try:
        def progress_callback(progress):
            global _current_progress
            _current_progress = progress
        
        saved_result, _, reports, evaluations = _execute_optimization(excel_file, progress_callback=progress_callback)
        
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
