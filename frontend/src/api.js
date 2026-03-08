const API_BASE = import.meta.env.VITE_API_URL || '';

export async function optimizeExcel(file) {
  const formData = new FormData();
  formData.append("excel_file", file);

  const response = await fetch(`${API_BASE}/api/optimize`, {
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
  const response = await fetch(`${API_BASE}/api/progress`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Failed to fetch progress");
  }
  return payload;
}

export async function optimizeExcelWithProgress(file, mode, onProgress) {
  const formData = new FormData();
  formData.append("excel_file", file);
  if (mode) formData.append("optimization_mode", mode);

  // Start the optimization
  const optimizationPromise = fetch(`${API_BASE}/api/optimize`, {
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
  const response = await fetch(`${API_BASE}/api/results/latest`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Failed to fetch latest result");
  }
  return payload;
}

// ─── localStorage Test Cases Management ─────────────────────────────────────

const TESTCASES_STORAGE_KEY = "velora_testcases";

/**
 * Save a new test case to localStorage (only client-side storage, no database)
 */
export function saveTestCaseLocally(testCaseData) {
  try {
    const cases = getTestCasesFromLocalStorage();
    const newCase = {
      id: Date.now(), // Use timestamp as unique ID
      filename: testCaseData.filename || "Test Case",
      created_at: new Date().toISOString(),
      result_data: testCaseData.result_data,
      result_data_noconstraints: testCaseData.result_data_noconstraints,
      result_data_infeasible: testCaseData.result_data_infeasible,
      computed_metrics: testCaseData.computed_metrics,
      reports: testCaseData.reports || {}, // Save human-readable optimization reports
      evaluations: testCaseData.evaluations || null, // Constraint evaluation data
    };
    cases.push(newCase);
    localStorage.setItem(TESTCASES_STORAGE_KEY, JSON.stringify(cases));
    return newCase;
  } catch (err) {
    console.error("[localStorage] Failed to save test case:", err);
    throw err;
  }
}

/**
 * Fetch all test cases from localStorage (no database queries)
 */
export function fetchResults() {
  try {
    const cases = getTestCasesFromLocalStorage();
    return {
      results: cases.map((c) => ({
        id: c.id,
        filename: c.filename,
        created_at: c.created_at,
        computed_metrics: c.computed_metrics,
      })),
    };
  } catch (err) {
    console.error("[localStorage] Failed to fetch test cases:", err);
    return { results: [] };
  }
}

/**
 * Get a specific test case from localStorage
 */
export function getTestCaseFromLocalStorage(testCaseId) {
  try {
    const cases = getTestCasesFromLocalStorage();
    return cases.find((c) => c.id === testCaseId) || null;
  } catch (err) {
    console.error("[localStorage] Failed to get test case:", err);
    return null;
  }
}

/**
 * Fetch detailed test case from localStorage
 */
export async function fetchResultDetail(resultId) {
  const testCase = getTestCaseFromLocalStorage(resultId);
  if (!testCase) {
    throw new Error("Test case not found in localStorage");
  }
  return {
    id: testCase.id,
    original_filename: testCase.filename,
    created_at: testCase.created_at,
    result: testCase.result_data,
    result_noconstraints: testCase.result_data_noconstraints,
    result_infeasible: testCase.result_data_infeasible,
    computed_metrics: testCase.computed_metrics,
    reports: testCase.reports || {}, // Include human-readable optimization reports
    evaluations: testCase.evaluations || null, // Constraint evaluation data
  };
}

export async function postDynamicOptimization(testCaseData, newEmployees) {
  const currentEnv = process.env.NODE_ENV || 'development';
  let baseURL = currentEnv === 'development' ? 'http://localhost:8000' : 'https://api.velora-opti26.xyz';

  const payload = {
    testCaseData,
    newEmployees
  };

  console.log("Payload:", payload);

  const response = await fetch(`${baseURL}/api/optimize/dynamic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Dynamic optimization failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a test case from localStorage and attempt to delete from database
 */
export function deleteResult(resultId) {
  try {
    // Delete from localStorage (primary storage)
    const cases = getTestCasesFromLocalStorage();
    const filteredCases = cases.filter((c) => c.id !== resultId);
    localStorage.setItem(TESTCASES_STORAGE_KEY, JSON.stringify(filteredCases));

    // Attempt to delete from database (if record exists)
    // This is best-effort and won't fail if the database record doesn't exist
    if (typeof resultId === "number" || !isNaN(parseInt(resultId, 10))) {
      fetch(`${API_BASE}/api/results/${resultId}`, { method: "DELETE" })
        .then((res) => {
          if (!res.ok && res.status !== 404) {
            console.warn("[DB] Warning: Failed to delete database record for test case:", resultId);
          } else if (res.ok) {
            console.log("[DB] Successfully deleted database record for test case:", resultId);
          }
        })
        .catch((err) => {
          console.warn("[DB] Warning: Could not delete database record:", err.message);
        });
    }

    return { ok: true, deleted_id: resultId };
  } catch (err) {
    console.error("[localStorage] Failed to delete test case:", err);
    throw err;
  }
}

/**
 * Delete ALL test cases from localStorage and attempt to clean database
 */
export function deleteAllTestCases() {
  try {
    // Get all cases before deletion to attempt DB cleanup
    const cases = getTestCasesFromLocalStorage();

    // Delete from localStorage
    localStorage.removeItem(TESTCASES_STORAGE_KEY);

    // Attempt to delete all database records
    // This is best-effort and won't fail if database is unavailable
    cases.forEach((testCase) => {
      if (typeof testCase.id === "number" || !isNaN(parseInt(testCase.id, 10))) {
        fetch(`${API_BASE}/api/results/${testCase.id}`, { method: "DELETE" })
          .then((res) => {
            if (!res.ok && res.status !== 404) {
              console.warn("[DB] Warning: Failed to delete database record:", testCase.id);
            }
          })
          .catch((err) => {
            console.warn("[DB] Warning: Could not delete database record:", err.message);
          });
      }
    });

    return { ok: true };
  } catch (err) {
    console.error("[localStorage] Failed to delete all test cases:", err);
    throw err;
  }
}

/**
 * Get all test cases from localStorage (internal helper)
 */
function getTestCasesFromLocalStorage() {
  try {
    const data = localStorage.getItem(TESTCASES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("[localStorage] Error parsing test cases:", err);
    return [];
  }
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

export async function fetchRoadGeometry(latLngPoints, maxRetries = 3) {
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

  // ── API fetch with retry logic ──
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const encodedPath = normalizedPoints
        .map(([lat, lng]) => `${lng},${lat}`)
        .join(";");
      const response = await fetch(
        `${API_BASE}/api/route-geometry?coordinates=${encodeURIComponent(encodedPath)}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        lastError = payload.error || `HTTP ${response.status}`;
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise(resolve => setTimeout(resolve, 100 * (2 ** attempt)));
          continue;
        }
        throw new Error(lastError);
      }

      // Successfully got a response
      const returnedCoords = payload.coordinates;
      const isRealGeometry =
        Array.isArray(returnedCoords) &&
        returnedCoords.length > normalizedPoints.length;

      if (isRealGeometry) {
        writeCache(cacheKey, payload);
      } else {
        // Don't cache straight-line passthrough responses
        if (payload.source === 'fallback' || payload.source === 'osrm-segmented') {
          console.warn(
            "[route-geometry] Response appears to be mostly fallback - skipping cache",
            { source: payload.source, inputPoints: normalizedPoints.length, outputPoints: returnedCoords?.length }
          );
        }
      }

      return payload;
    } catch (err) {
      lastError = err.message;
      if (attempt < maxRetries - 1) {
        // Exponential backoff before retry
        await new Promise(resolve => setTimeout(resolve, 100 * (2 ** attempt)));
        continue;
      }
    }
  }

  // All retries failed - log and return fallback
  console.warn(
    "[route-geometry] All retries failed, using straight-line fallback:",
    lastError,
  );
  return { coordinates: normalizedPoints, source: "fallback" };
}