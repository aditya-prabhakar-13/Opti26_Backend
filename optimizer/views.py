import os
import json
import subprocess
import tempfile
import requests
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods
from django.core.management import call_command
from django.db.utils import OperationalError, ProgrammingError
from .models import OptimizationResult
from .utils import parse_excel_to_dict, NpEncoder

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

def _save_optimization_result(filename, result_data):
    try:
        return OptimizationResult.objects.create(
            original_filename=filename,
            result_data=result_data,
        )
    except (OperationalError, ProgrammingError) as exc:
        if not _db_table_missing(exc):
            raise

        # Bootstrap DB schema automatically for first-time local runs.
        call_command('migrate', interactive=False, verbosity=0)
        return OptimizationResult.objects.create(
            original_filename=filename,
            result_data=result_data,
        )

def _execute_optimization(excel_file):
    if not excel_file.name.lower().endswith('.xlsx'):
        raise ValueError("Only .xlsx files are supported")

    # 1. Ensure a 'results' directory exists in your project root
    results_dir = os.path.join(os.getcwd(), 'results')
    if not os.path.exists(results_dir):
        os.makedirs(results_dir)

    # 2. Setup temporary file paths
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_excel:
        for chunk in excel_file.chunks():
            tmp_excel.write(chunk)
        tmp_excel_path = tmp_excel.name

    # Create unique names for input/output JSON files
    base_name = os.path.basename(tmp_excel_path).replace('.xlsx', '')
    input_json_path = os.path.join(results_dir, f"{base_name}_in.json")
    output_json_path = os.path.join(results_dir, f"{base_name}_out.json")

    try:
        # 3. Parse Excel to Dictionary and save as input JSON
        parsed_data = parse_excel_to_dict(tmp_excel_path)
        with open(input_json_path, 'w') as f:
            json.dump(parsed_data, f, cls=NpEncoder)

        # 4. Run velora.exe with explicit input and output arguments
        # argv[1] = input_file, argv[2] = output_file
        exe_path = os.path.join(os.getcwd(), 'velora.exe')
        if not os.path.exists(exe_path):
            raise RuntimeError("velora.exe is missing in project root")
        
        # Execute: velora.exe results/tmp_in.json results/tmp_out.json
        result = subprocess.run(
            [exe_path, input_json_path, output_json_path],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise RuntimeError(f"Optimizer failed with code {result.returncode}: {result.stderr or result.stdout}")

        # 5. Check if the output file was created and read it
        if not os.path.exists(output_json_path):
            raise RuntimeError(f"Output file not created. CLI Output: {result.stdout}")

        with open(output_json_path, 'r') as f:
            final_data = json.load(f)

        # 6. Save the structured JSON data to the database
        saved_result = _save_optimization_result(excel_file.name, final_data)
        return saved_result, final_data
    finally:
        # 7. Cleanup temporary files to save disk space
        for path in [tmp_excel_path, input_json_path, output_json_path]:
            if path and os.path.exists(path):
                os.remove(path)

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

    try:
        saved_result, _ = _execute_optimization(excel_file)
        return JsonResponse(_serialize_result(saved_result), encoder=NpEncoder)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

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

    def _fetch_osrm(coords: str, timeout_sec=25):
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson&steps=false"
        response = requests.get(osrm_url, timeout=timeout_sec)
        payload = response.json() if response.ok else {}
        routes = payload.get('routes', [])
        if routes and routes[0].get('geometry', {}).get('coordinates'):
            return routes[0]['geometry']['coordinates']
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
    except Exception:
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
            segment = _fetch_osrm(pair_coords, timeout_sec=15)
            if segment:
                segment_lat_lng = [[coord[1], coord[0]] for coord in segment]
                if stitched and segment_lat_lng:
                    segment_lat_lng = segment_lat_lng[1:]
                stitched.extend(segment_lat_lng)
                osrm_segment_count += 1
                continue
        except Exception:
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
