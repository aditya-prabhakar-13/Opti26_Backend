export async function optimizeExcel(file) {
  const formData = new FormData();
  formData.append('excel_file', file);

  const response = await fetch('/api/optimize', {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Optimization failed');
  }

  return payload;
}

export async function fetchLatestResult() {
  const response = await fetch('/api/results/latest');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to fetch latest result');
  }
  return payload;
}

export async function fetchResults() {
  const response = await fetch('/api/results');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to fetch results');
  }
  return payload;
}

export async function fetchResultDetail(resultId) {
  const response = await fetch(`/api/results/${resultId}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to fetch result detail');
  }
  return payload;
}

export async function deleteResult(resultId) {
  const response = await fetch(`/api/results/${resultId}`, {
    method: 'DELETE',
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to delete result');
  }

  return payload;
}

export async function fetchRoadGeometry(latLngPoints) {
  if (!Array.isArray(latLngPoints) || latLngPoints.length < 2) {
    return { coordinates: latLngPoints || [], source: 'fallback' };
  }

  const normalizedPoints = latLngPoints.filter((point, index) => {
    if (!Array.isArray(point) || point.length !== 2) {
      return false;
    }
    if (index === 0) {
      return true;
    }
    const [prevLat, prevLng] = latLngPoints[index - 1] || [];
    return point[0] !== prevLat || point[1] !== prevLng;
  });

  if (normalizedPoints.length < 2) {
    return { coordinates: latLngPoints || [], source: 'fallback' };
  }

  const encodedPath = normalizedPoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const response = await fetch(`/api/route-geometry?coordinates=${encodeURIComponent(encodedPath)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to fetch road geometry');
  }
  return payload;
}
