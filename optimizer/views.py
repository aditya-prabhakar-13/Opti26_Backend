import os
import json
import subprocess
import tempfile
from django.shortcuts import render
from django.http import HttpResponse
from django.conf import settings
from .models import OptimizationResult
from .utils import parse_excel_to_dict, NpEncoder

def run_optimization(request):
    if request.method == 'POST' and request.FILES.get('excel_file'):
        excel_file = request.FILES['excel_file']
        
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
            
            # Execute: velora.exe results/tmp_in.json results/tmp_out.json
            result = subprocess.run(
                [exe_path, input_json_path, output_json_path],
                capture_output=True,
                text=True
            )

            # 5. Check if the output file was created and read it
            if os.path.exists(output_json_path):
                with open(output_json_path, 'r') as f:
                    final_data = json.load(f)
                
                # 6. Save the structured JSON data to the database
                OptimizationResult.objects.create(
                    original_filename=excel_file.name,
                    result_data=final_data
                )
                return HttpResponse("Optimization complete! Result saved to database.")
            else:
                return HttpResponse(f"Error: Output file not created. CLI Output: {result.stdout}", status=500)

        except Exception as e:
            return HttpResponse(f"System Error: {str(e)}", status=500)
        
        finally:
            # 7. Cleanup temporary files to save disk space
            for path in [tmp_excel_path, input_json_path, output_json_path]:
                if path and os.path.exists(path):
                    os.remove(path)

    return render(request, 'optimizer/upload.html')