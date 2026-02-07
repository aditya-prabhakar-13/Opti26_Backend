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
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def parse_excel_to_dict(file_path):
    """
    Parses Excel and removes any rows containing empty fields.
    """
    try:
        with pd.ExcelFile(file_path) as xls:
            # Load and immediately drop rows with any empty (NaN) cells
            df_emp = xls.parse('employees').dropna()
            df_veh = xls.parse('vehicles').dropna()
            df_base = xls.parse('baseline').dropna()
            df_meta = xls.parse('metadata').dropna()

        employee_ids = []
        matrix_locations = []
        for _, row in df_emp.iterrows():
            employee_ids.append(row['employee_id'])
            matrix_locations.append([row['pickup_lng'], row['pickup_lat']])
        
        # Office location based on the first valid employee row
        office_loc = [df_emp.iloc[0]['drop_lng'], df_emp.iloc[0]['drop_lat']]
        matrix_locations.append(office_loc)
        office_idx = len(matrix_locations) - 1

        distance_matrix = get_osrm_matrix(matrix_locations)
        use_fallback = distance_matrix is None

        employees_dict = {}
        for i, emp_id in enumerate(employee_ids):
            row = df_emp.iloc[i]
            distances = {"drop": round(distance_matrix[i][office_idx] if not use_fallback else 0, 1)}
            
            for j, other_id in enumerate(employee_ids):
                if i != j:
                    distances[other_id] = round(distance_matrix[i][j] if not use_fallback else 0, 1)

            employees_dict[emp_id] = {
                "priority": row['priority'],
                "pickup": {'lat': row['pickup_lat'], 'lng': row['pickup_lng']},
                "drop": {'lat': row['drop_lat'], 'lng': row['drop_lng']},
                "earliest_pickup": row['earliest_pickup'],
                "latest_drop": row['latest_drop'],
                "vehicle_preference": row['vehicle_preference'],
                "sharing_preference": row['sharing_preference'],
                "distances": distances
            }
            
        return {
            "employees": employees_dict,
            "vehicles": df_veh.to_dict(orient='records'),
            "baseline": df_base.to_dict(orient='records'),
            "metadata": df_meta.to_dict(orient='records')
        }
    except Exception as e:
        raise e