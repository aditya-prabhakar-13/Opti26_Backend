export async function optimizeExcel(file) {
  const formData = new FormData();
  formData.append("excel_file", file);

  const response = await fetch("/api/optimize", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Optimization failed");
  }

  return payload;
}

export async function getProgress() {
  const response = await fetch(`/api/progress`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Failed to fetch progress");
  }
  return payload;
}

export async function optimizeExcelWithProgress(file, onProgress) {
  const formData = new FormData();
  formData.append("excel_file", file);

  // Start the optimization
  const optimizationPromise = fetch("/api/optimize", {
    method: "POST",
    body: formData,
  }).then(async (response) => {
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Optimization failed");
    }
    return payload;
  });

  // Start polling for progress updates
  const maxAttempts = 300; // 5 minutes of polling at 500ms intervals
  let attempts = 0;

  const progressPollingPromise = new Promise((resolve, reject) => {
    const pollProgress = async () => {
      try {
        attempts++;
        const progress = await getProgress();
        
        if (onProgress) {
          onProgress(progress);
        }

        // Stop polling if optimization is complete
        if (progress.stage === 'complete' || progress.stage === 'error' || progress.percentage >= 100) {
          resolve();
          return;
        }

        if (attempts >= maxAttempts) {
          resolve(); // Timeout - stop polling
          return;
        }

        // Poll every 500ms
        setTimeout(pollProgress, 500);
      } catch (error) {
        // Silently ignore polling errors
        if (attempts < maxAttempts) {
          setTimeout(pollProgress, 500);
        } else {
          resolve();
        }
      }
    };

    pollProgress();
  });

  // Wait for optimization to complete
  const result = await optimizationPromise;
  // Wait a bit for progress polling to catch up
  await progressPollingPromise;
  
  return result;
}

export async function fetchLatestResult() {
  const response = await fetch("/api/results/latest");
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Failed to fetch latest result");
  }
  return payload;
}

export async function fetchResults() {
  const response = await fetch("/api/results");
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Failed to fetch results");
  }
  return payload;
}

export async function fetchResultDetail(resultId) {
  const response = await fetch(`/api/results/${resultId}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Failed to fetch result detail");
  }
  return payload;
}

export async function deleteResult(resultId) {
  const response = await fetch(`/api/results/${resultId}`, {
    method: "DELETE",
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Failed to delete result");
  }

  return payload;
}

// ─── Route Geometry Cache ─────────────────────────────────────────────────────

const CACHE_PREFIX = "velora_route_";
// v2: bumped to invalidate any v1 entries that may have stored straight-line fallbacks
const CACHE_VERSION = "v2";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Stable, short cache key derived from a djb2 hash of the point array. */
function routeCacheKey(points) {
  const serialized = points.map(([lat, lng]) => `${lat},${lng}`).join("|");
  let hash = 5381;
  for (let i = 0; i < serialized.length; i++) {
    hash = ((hash << 5) + hash) ^ serialized.charCodeAt(i);
    hash = hash >>> 0; // unsigned 32-bit
  }
  return `${CACHE_PREFIX}${CACHE_VERSION}_${hash}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
      }),
    );
  } catch (e) {
    // Quota exceeded — evict oldest half of our entries and retry once
    if (e instanceof DOMException) {
      evictOldestRoutes();
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            data,
            expiresAt: Date.now() + CACHE_TTL_MS,
          }),
        );
      } catch {
        // Still failed — give up silently, cache is a nice-to-have
      }
    }
  }
}

function evictOldestRoutes() {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CACHE_PREFIX)) continue;
    try {
      const { expiresAt } = JSON.parse(localStorage.getItem(key));
      entries.push({ key, expiresAt });
    } catch {
      localStorage.removeItem(key);
    }
  }
  entries.sort((a, b) => a.expiresAt - b.expiresAt);
  entries.slice(0, Math.ceil(entries.length / 2)).forEach(({ key }) => {
    localStorage.removeItem(key);
  });
}

/** Wipe all cached Velora routes. Call this from devtools if needed: import { clearRouteCache } from './api' */
export function clearRouteCache() {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) toRemove.push(key);
  }
  toRemove.forEach((key) => localStorage.removeItem(key));
  console.info(`[route cache] Cleared ${toRemove.length} entries.`);
}

// ─── fetchRoadGeometry ────────────────────────────────────────────────────────

export async function fetchRoadGeometry(latLngPoints) {
  if (!Array.isArray(latLngPoints) || latLngPoints.length < 2) {
    return { coordinates: latLngPoints || [], source: "fallback" };
  }

  // Remove consecutive duplicate points
  const normalizedPoints = latLngPoints.filter((point, index) => {
    if (!Array.isArray(point) || point.length !== 2) return false;
    if (index === 0) return true;
    const [prevLat, prevLng] = latLngPoints[index - 1] || [];
    return point[0] !== prevLat || point[1] !== prevLng;
  });

  if (normalizedPoints.length < 2) {
    return { coordinates: latLngPoints || [], source: "fallback" };
  }

  // ── Cache read ──
  const cacheKey = routeCacheKey(normalizedPoints);
  const cached = readCache(cacheKey);
  if (cached) {
    return cached;
  }

  // ── API fetch ──
  let payload;
  try {
    const encodedPath = normalizedPoints
      .map(([lat, lng]) => `${lng},${lat}`)
      .join(";");
    const response = await fetch(
      `/api/route-geometry?coordinates=${encodeURIComponent(encodedPath)}`,
    );
    payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Failed to fetch road geometry");
    }
  } catch (err) {
    // API failed — return straight-line fallback but NEVER cache it
    console.warn(
      "[route cache] API error, using straight-line fallback:",
      err.message,
    );
    return { coordinates: normalizedPoints, source: "fallback" };
  }

  // ── Guard: only cache genuine road geometry ──
  // A real OSRM/road response will have significantly more points than the
  // input waypoints. If the response looks like a straight-line passthrough
  // (same or fewer coords), don't cache it so we retry next time.
  const returnedCoords = payload.coordinates;
  const isRealGeometry =
    Array.isArray(returnedCoords) &&
    returnedCoords.length > normalizedPoints.length;

  if (isRealGeometry) {
    writeCache(cacheKey, payload);
  } else {
    console.warn(
      "[route cache] Response has no more points than input — looks like a passthrough or fallback. Skipping cache write.",
    );
  }

  return payload;
}
