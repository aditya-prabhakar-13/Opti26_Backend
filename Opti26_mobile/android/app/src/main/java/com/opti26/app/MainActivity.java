package com.opti26.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

		View root = findViewById(android.R.id.content);
		ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
			Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
			Insets statusBars = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());

			view.setPadding(systemBars.left, statusBars.top, systemBars.right, systemBars.bottom);
			return windowInsets;
		});
		ViewCompat.requestApplyInsets(root);
	}
}
