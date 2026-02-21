from django.contrib import admin
from django.urls import path
from optimizer.views import (
    run_optimization,
    api_optimize,
    api_progress,
    api_latest_result,
    api_results,
    api_result_detail,
    api_route_geometry,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', run_optimization, name='home'), # This makes the upload screen the main page
    path('api/optimize', api_optimize, name='api_optimize'),
    path('api/progress', api_progress, name='api_progress'),
    path('api/results', api_results, name='api_results'),
    path('api/results/<int:result_id>', api_result_detail, name='api_result_detail'),
    path('api/results/latest', api_latest_result, name='api_latest_result'),
    path('api/route-geometry', api_route_geometry, name='api_route_geometry'),
]
