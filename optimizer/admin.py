from django.contrib import admin
from .models import OptimizationResult

@admin.register(OptimizationResult)
class OptimizationResultAdmin(admin.ModelAdmin):
    list_display = ('original_filename', 'created_at')