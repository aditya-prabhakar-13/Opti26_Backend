from django.db import models

class OptimizationResult(models.Model):
    # Store the name of the original file for reference
    original_filename = models.CharField(max_length=255)
    # Store the JSON output as a text field or JSONField
    result_data = models.JSONField() 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Result for {self.original_filename} ({self.created_at})"