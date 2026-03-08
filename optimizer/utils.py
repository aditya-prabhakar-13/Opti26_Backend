import pandas as pd
import json
import numpy as np
import datetime
import requests
import math

# OSRM Configuration
OSRM_BASE_URL = "http://router.project-osrm.org/table/v1/driving/"

class NpEncoder(json.JSONEncoder):
    """
    Custom encoder for NumPy data types, datetime objects, and NaN handling.
    """
    def default(self, obj):
        if isinstance(obj, (float, np.floating)):
            if math.isnan(obj) or math.isinf(obj):
                return None 
            return float(obj)
        if isinstance(obj, (np.integer, np.int64)):
            return int(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, datetime.time):
            return obj.strftime('%H:%M')
        if isinstance(obj, datetime.datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        return super(NpEncoder, self).default(obj)

def get_osrm_matrix(locations):
    loc_string = ";".join([f"{loc[0]},{loc[1]}" for loc in locations])
    url = f"{OSRM_BASE_URL}{loc_string}?annotations=distance"
    try:
        response = requests.get(url, timeout=30)
        return response.json().get('distances') if response.status_code == 200 else None
    except Exception:
        return None

def haversine_fallback(lat1, lon1, lat2, lon2):
    R = 6371000  
    # Force float conversion to prevent string crashes
    phi1, phi2 = math.radians(float(lat1)), math.radians(float(lat2))
    dphi = math.radians(float(lat2) - float(lat1))
    dlambda = math.radians(float(lon2) - float(lon1))
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def clean_value(value):
    """
    Convert NaN, inf, and other problematic values to None for JSON serialization.
    """
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    elif isinstance(value, (np.floating, np.integer)):
        if math.isnan(value) or math.isinf(value):
            return None
        return float(value) if isinstance(value, np.floating) else int(value)
    elif pd.isna(value):
        return None
    return value

def clean_dict(obj):
    """
    Recursively clean all values in a dictionary or list.
    """
    if isinstance(obj, dict):
        return {k: clean_dict(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_dict(v) for v in obj]
    else:
        return clean_value(obj)

def parse_excel_to_dict(file_path, optimization_mode=None):
    try:
        def _find_empty_cells(df, sheet_name):
            empties = []
            for r_idx, row in df.iterrows():
                for col in df.columns:
                    value = row[col]
                    if pd.isna(value):
                        empties.append((r_idx + 2, col))
                        continue
                    if value is None:
                        empties.append((r_idx + 2, col))
                        continue
                    if isinstance(value, str) and value.strip() == "":
                        empties.append((r_idx + 2, col))
            return empties

        with pd.ExcelFile(file_path) as xls:
            required_sheets = {'employees', 'vehicles', 'baseline', 'metadata'}
            missing_sheets = required_sheets.difference(set(xls.sheet_names))
            if missing_sheets:
                raise ValueError(f"Missing required sheets: {', '.join(sorted(missing_sheets))}")

            # Use how='all' to only drop rows that are completely empty
            df_emp = xls.parse('employees').dropna(how='all')
            df_veh = xls.parse('vehicles').dropna(how='all')
            df_base = xls.parse('baseline').dropna(how='all')
            df_meta = xls.parse('metadata').dropna(how='all')
            
            # Replace NaN values with None to ensure proper JSON serialization
            df_emp = df_emp.where(pd.notna(df_emp), None)
            df_veh = df_veh.where(pd.notna(df_veh), None)
            df_base = df_base.where(pd.notna(df_base), None)
            df_meta = df_meta.where(pd.notna(df_meta), None)

        if df_emp.empty or df_veh.empty:
            raise ValueError("Employees and vehicles sheets must contain at least one valid row")

        required_employee_cols = {
            'employee_id', 'priority', 'pickup_lat', 'pickup_lng', 'drop_lat', 'drop_lng',
            'earliest_pickup', 'latest_drop', 'vehicle_preference', 'sharing_preference'
        }
        missing_cols = required_employee_cols.difference(set(df_emp.columns))
        if missing_cols:
            raise ValueError(f"Missing required employee columns: {', '.join(sorted(missing_cols))}")

        # Reject files with empty fields in required sheets.
        for sheet_name, df in (
            ("employees", df_emp),
            ("vehicles", df_veh),
            ("baseline", df_base),
            ("metadata", df_meta),
        ):
            empty_cells = _find_empty_cells(df, sheet_name)
            if empty_cells:
                row_no, col_name = empty_cells[0]
                raise ValueError(
                    f"Please pass a proper excel file: empty value found in '{sheet_name}' sheet "
                    f"at row {row_no}, column '{col_name}'"
                )

        # Reject invalid vehicle speed values.
        if 'avg_speed_kmph' not in df_veh.columns:
            raise ValueError("Please pass a proper excel file: missing 'avg_speed_kmph' in vehicles sheet")
        speed_series = pd.to_numeric(df_veh['avg_speed_kmph'], errors='coerce')
        invalid_speed_rows = df_veh[speed_series.isna() | (speed_series <= 0)]
        if not invalid_speed_rows.empty:
            row_no = int(invalid_speed_rows.index[0]) + 2
            raise ValueError(
                f"Please pass a proper excel file: vehicle avg_speed_kmph must be > 0 "
                f"(vehicles sheet row {row_no})"
            )

        employee_ids = []
        matrix_locations = []
        for _, row in df_emp.iterrows():
            employee_ids.append(row['employee_id'])
            matrix_locations.append([row['pickup_lng'], row['pickup_lat']])
        
        office_loc = [df_emp.iloc[0]['drop_lng'], df_emp.iloc[0]['drop_lat']]
        matrix_locations.append(office_loc)
        office_idx = len(matrix_locations) - 1

        distance_matrix = get_osrm_matrix(matrix_locations)
        use_fallback = distance_matrix is None

        employees_dict = {}
        for i, emp_id in enumerate(employee_ids):
            row = df_emp.iloc[i]
            
            # Check for missing OSRM matrix OR null values inside the matrix
            if use_fallback or distance_matrix[i][office_idx] is None:
                drop_distance = haversine_fallback(
                    row['pickup_lat'], row['pickup_lng'],
                    row['drop_lat'], row['drop_lng'],
                )
            else:
                drop_distance = distance_matrix[i][office_idx]

            distances = {"drop": round(float(drop_distance), 1)}
            
            for j, other_id in enumerate(employee_ids):
                if i != j:
                    other = df_emp.iloc[j]
                    if use_fallback or distance_matrix[i][j] is None:
                        inter_distance = haversine_fallback(
                            row['pickup_lat'], row['pickup_lng'],
                            other['pickup_lat'], other['pickup_lng'],
                        )
                    else:
                        inter_distance = distance_matrix[i][j]
                    
                    distances[other_id] = round(float(inter_distance), 1)

            employees_dict[emp_id] = {
                "priority": clean_value(row['priority']),
                "pickup": {'lat': clean_value(row['pickup_lat']), 'lng': clean_value(row['pickup_lng'])},
                "drop": {'lat': clean_value(row['drop_lat']), 'lng': clean_value(row['drop_lng'])},
                "earliest_pickup": clean_value(row['earliest_pickup']),
                "latest_drop": clean_value(row['latest_drop']),
                "vehicle_preference": clean_value(row['vehicle_preference']),
                "sharing_preference": clean_value(row['sharing_preference']),
                "distances": distances
            }
            
        # Clean all dictionaries to remove any remaining NaN values
        result = {
            "employees": employees_dict,
            "vehicles": clean_dict(df_veh.to_dict(orient='records')),
            "baseline": clean_dict(df_base.to_dict(orient='records')),
            "metadata": clean_dict(df_meta.to_dict(orient='records'))
        }
        if optimization_mode is not None:
            result["config"] = [{"key": "alns_depth","value":optimization_mode}]
        return result
    except Exception as e:
        raise e
