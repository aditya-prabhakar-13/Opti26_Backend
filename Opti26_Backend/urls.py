from django.contrib import admin
from django.urls import path
from optimizer.views import run_optimization

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', run_optimization, name='home'), # This makes the upload screen the main page
]