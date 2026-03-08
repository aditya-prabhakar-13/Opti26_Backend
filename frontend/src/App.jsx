import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteResult,
  deleteAllTestCases,
  fetchResultDetail,
  fetchResults,
  fetchRoadGeometry,
  optimizeExcelWithProgress,
  saveTestCaseLocally,
} from "./api";
import {
  buildMapData,
  getMetrics,
  normalizeOptimizationPayload,
  toResultsListRows,
} from "./lib/transform";

import DashboardView from "./components/DashboardView.jsx";
import TestCasesView from "./components/TestcasesView.jsx";
import NewCaseView from "./components/NewCaseView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ProgressBar from "./components/ProgressBar.jsx";

export default function App() {
  const [activeNav, setActiveNav] = useState("new");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760);
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);

  // Ensure evaluations are loaded from local storage for the selected result
  useEffect(() => {
    if (selectedResult && !selectedResult.evaluations) {
      try {
        const cases = JSON.parse(localStorage.getItem('velora_testcases') || '[]');
        const tc = cases.find(c => String(c.id) === String(selectedResult.id));
        if (tc && tc.evaluations) {
          setSelectedResult(prev => ({ ...prev, evaluations: tc.evaluations }));
        }
      } catch (err) {
        console.error("Failed to load evaluations for selected result", err);
      }
    }
  }, [selectedResult]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [mapMode, setMapMode] = useState("optimized");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [routeGeometries, setRouteGeometries] = useState({
    optimized: {},
    noconstraints: {},
    infeasible: {},
  });
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routesLoadedCount, setRoutesLoadedCount] = useState(0);
  const [totalRoutesCount, setTotalRoutesCount] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legendVisible, setLegendVisible] = useState(false);
  const [progress, setProgress] = useState({
    stage: "starting",
    percentage: 0,
    message: "",
  });
  const [showProgress, setShowProgress] = useState(false);

  const hasCases = results.length > 0;
  const effectiveNav = hasCases ? activeNav : "new";

  /* ── Bootstrap ── */
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const rowsPayload = await Promise.resolve(fetchResults());
        if (!mounted) return;

        const rows = toResultsListRows(rowsPayload);
        setResults(rows);

        if (rows.length === 0) {
          setActiveNav("new");
          return;
        }

        setActiveNav("dashboard");

        const detail = await fetchResultDetail(rows[0].id);
        if (mounted) setSelectedResult(normalizeOptimizationPayload(detail));

      } catch (initErr) {
        if (mounted) {
          setError(initErr.message || "Unable to load existing results");
          setResults([]);
          setActiveNav("new");
        }
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasCases) setSidebarOpen(false);
  }, [hasCases]);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 760);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const shouldHideOverflow =
      (!hasCases || effectiveNav === "new") && !isMobile;
    document.body.style.overflowY = shouldHideOverflow ? "hidden" : "auto";
    return () => {
      document.body.style.overflowY = "auto";
    };
  }, [hasCases, effectiveNav, isMobile]);

  /* ── Route geometries ── */
  useEffect(() => {
    let cancelled = false;

    async function loadGeometries() {
      // Load routes for ALL modes in parallel so switching is instant
      const modes = ["optimized", "noconstraints", "infeasible"];
      const allMapData = modes.map((mode) => ({
        mode,
        mapData: buildMapData(selectedResult, mode),
      }));
      const allTrips = allMapData.flatMap(({ mode, mapData }) =>
        mapData.trips.map((trip) => ({ mode, trip })),
      );

      if (allTrips.length === 0) {
        setRouteGeometries({
          optimized: {},
          noconstraints: {},
          infeasible: {},
        });
        setIsRouteLoading(false);
        setRoutesLoadedCount(0);
        setTotalRoutesCount(0);
        return;
      }

      setIsRouteLoading(true);
      setTotalRoutesCount(allTrips.length);
      setRoutesLoadedCount(0);

      // Track progress as routes load
      let loadedCount = 0;

      const routePromises = allTrips.map(async ({ mode, trip }) => {
        try {
          const route = await fetchRoadGeometry(trip.path);
          const coords =
            Array.isArray(route.coordinates) && route.coordinates.length >= 2
              ? route.coordinates
              : trip.path;
          const result = [mode, trip.id, coords];

          if (!cancelled) {
            loadedCount++;
            setRoutesLoadedCount(loadedCount);
          }

          return result;
        } catch {
          const result = [mode, trip.id, trip.path];

          if (!cancelled) {
            loadedCount++;
            setRoutesLoadedCount(loadedCount);
          }

          return result;
        }
      });

      try {
        const results = await Promise.all(routePromises);

        if (!cancelled) {
          const nextGeometries = {
            optimized: {},
            noconstraints: {},
            infeasible: {},
          };
          results.forEach(([mode, tripId, coords]) => {
            if (!nextGeometries[mode]) nextGeometries[mode] = {};
            nextGeometries[mode][tripId] = coords;
          });
          setRouteGeometries(nextGeometries);
          setIsRouteLoading(false);
          setRoutesLoadedCount(0);
          setTotalRoutesCount(0);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading route geometries:", error);
          setIsRouteLoading(false);
          setRoutesLoadedCount(0);
          setTotalRoutesCount(0);
        }
      }
    }

    loadGeometries();
    return () => {
      cancelled = true;
    };
  }, [selectedResult]);

  /* ── Actions ── */
  async function refreshResults(selectId = null) {
    const rowsPayload = await fetchResults();
    const rows = toResultsListRows(rowsPayload);
    setResults(rows);

    if (rows.length === 0) {
      setSelectedResult(null);
      return rows;
    }

    const idToLoad = selectId ?? rows[0].id;
    const detail = await fetchResultDetail(idToLoad);
    setSelectedResult(normalizeOptimizationPayload(detail));
    return rows;
  }

  function handleOptimizationComplete() {
    // Hide progress and redirect to dashboard
    setShowProgress(false);
    setActiveNav("dashboard");
  }

  async function runOptimization(mode) {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }
    setLoading(true);
    setError("");

    try {
      if (selectedFile.name.endsWith('.json')) {
        // Handle JSON import bypass directly
        const text = await selectedFile.text();
        const importedData = JSON.parse(text);

        // Basic validation
        if (!importedData.result_data && !importedData.reports) {
          throw new Error("Invalid Velora testcase JSON file format");
        }

        // Just pass to local storage; ensure it has the original filename or a default
        importedData.filename = importedData.filename || selectedFile.name;

        // Remove 'id' if exists to force a new unique record local ID instead of conflict
        delete importedData.id;

        const savedTestCase = saveTestCaseLocally(importedData);

        const normalized = normalizeOptimizationPayload({
          id: savedTestCase.id,
          filename: savedTestCase.filename,
          result: savedTestCase.result_data,
          result_noconstraints: savedTestCase.result_data_noconstraints,
          result_infeasible: savedTestCase.result_data_infeasible,
          computed_metrics: savedTestCase.computed_metrics,
          reports: savedTestCase.reports,
          evaluations: savedTestCase.evaluations,
        });

        setSelectedResult(normalized);
        setVehicleFilter("ALL");
        await refreshResults(normalized.id);
        setActiveNav("dashboard");
        setTimeout(() => setShowProgress(false), 500);

      } else {
        // Standard Excel Flow
        setShowProgress(true);
        setProgress({
          stage: "starting",
          percentage: 0,
          message: "Starting optimization...",
        });
        const created = await optimizeExcelWithProgress(
          selectedFile,
          mode,
          (progressUpdate) => {
            setProgress(progressUpdate);
          },
        );

        // Save test case to localStorage (client-side only, no database)
        const testCaseData = {
          filename: selectedFile.name,
          result_data: created.result,
          result_data_noconstraints: created.result_noconstraints,
          result_data_infeasible: created.result_infeasible,
          computed_metrics: created.computed_metrics,
          reports: created.reports, // Save the human-readable optimization reports
          evaluations: created.evaluations || null, // Constraint evaluation data
        };
        const savedTestCase = saveTestCaseLocally(testCaseData);

        const normalized = normalizeOptimizationPayload({
          ...created,
          id: savedTestCase.id, // Use localStorage ID
        });
        setSelectedResult(normalized);

        setVehicleFilter("ALL");
        await refreshResults(normalized.id);
        setActiveNav("dashboard");

        // Keep progress visible for a moment before hiding
        setTimeout(() => setShowProgress(false), 1000);
      }
    } catch (runErr) {
      setError(runErr.message || "Optimization failed");
      setShowProgress(false);
    } finally {
      setLoading(false);
    }
  }

  async function openResult(resultId) {
    try {
      const detail = await fetchResultDetail(resultId);
      setSelectedResult(normalizeOptimizationPayload(detail));
      setActiveNav("dashboard");
      setSidebarOpen(false);
      setVehicleFilter("ALL");
    } catch (detailErr) {
      setError(detailErr.message || "Unable to load result");
    }
  }

  async function removeResult(resultId) {
    const shouldDelete = window.confirm("Delete this test case permanently?");
    if (!shouldDelete) return;

    setDeletingId(resultId);
    setError("");
    try {
      await deleteResult(resultId);
      const isCurrent = selectedResult?.id === resultId;
      if (isCurrent) setSelectedResult(null);
      const rows = await refreshResults();
      setActiveNav(rows.length === 0 ? "new" : "dashboard");
    } catch (deleteErr) {
      setError(deleteErr.message || "Unable to delete result");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteAllTestCases() {
    try {
      deleteAllTestCases();
      setSelectedResult(null);
      setResults([]);
      setActiveNav("new");
    } catch (error) {
      setError(error.message || "Unable to delete all test cases");
    }
  }

  /* ── Derived state ── */
  const metrics = useMemo(
    () => getMetrics(selectedResult, mapMode),
    [selectedResult, mapMode],
  );
  const mapData = useMemo(
    () => buildMapData(selectedResult, mapMode),
    [selectedResult, mapMode],
  );
  const visibleTrips = useMemo(() => {
    if (vehicleFilter === "ALL") return mapData.trips;
    const normalizeVehicleId = (value) =>
      String(value ?? "")
        .trim()
        .toLowerCase();
    const normalizedFilter = normalizeVehicleId(vehicleFilter);
    return mapData.trips.filter(
      (trip) => normalizeVehicleId(trip.vehicleId) === normalizedFilter,
    );
  }, [mapData.trips, vehicleFilter]);

  useEffect(() => {
    if (!mapData?.vehicles || vehicleFilter === "ALL") return;
    const normalizeVehicleId = (value) =>
      String(value ?? "")
        .trim()
        .toLowerCase();
    const normalizedFilter = normalizeVehicleId(vehicleFilter);
    const hasVehicle = mapData.vehicles.some(
      (v) => normalizeVehicleId(v) === normalizedFilter,
    );
    if (!hasVehicle) {
      setVehicleFilter("ALL");
    }
  }, [mapData?.vehicles, vehicleFilter]);

  const sharedMapProps = {
    mapData,
    vehicleFilter,
    setVehicleFilter,
    routeGeometries,
    isRouteLoading,
    routesLoadedCount,
    totalRoutesCount,
    legendVisible,
    setLegendVisible,
    visibleTrips,
    metrics,
    hasCases,
    selectedResult,
  };

  /* ── Layout ── */
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background:
          "linear-gradient(135deg, #0f1623 0%, #111827 50%, #0c1420 100%)",
      }}>
      <ProgressBar
        progress={progress}
        isVisible={showProgress}
        onComplete={handleOptimizationComplete}
      />
      {/* ── Sidebar (desktop always, mobile drawer) ── */}
      {hasCases && (
        <>
          {/* Desktop sidebar */}
          <div className="hidden md:flex flex-col w-64 flex-shrink-0">
            <Sidebar
              results={results}
              selectedResult={selectedResult}
              deletingId={deletingId}
              onNewCase={() => setActiveNav("new")}
              onOpenResult={openResult}
              onDeleteResult={removeResult}
              onDeleteAllTestCases={handleDeleteAllTestCases}
            />
          </div>

          {/* Mobile top bar */}
          {isMobile && (
            <header
              className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 py-3 md:hidden"
              style={{
                background: "rgba(15,22,35,0.95)",
                borderBottom: "1px solid rgba(148,163,184,0.08)",
                backdropFilter: "blur(12px)",
              }}>
              {/* Brand */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                  }}>
                  <img
                    src="/favicon.svg"
                    alt=""
                    className="w-4 h-4 brightness-0 invert"
                  />
                </div>
                <span
                  className="text-white font-bold text-base tracking-wide"
                  style={{ fontFamily: "'Fraunces', serif" }}>
                  VELORA
                </span>
              </div>

              {/* Hamburger */}
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span
                  className={`block w-4 h-[2px] bg-slate-300 rounded-full transition-all duration-200 ${sidebarOpen ? "rotate-45 translate-y-[7px]" : ""}`}
                />
                <span
                  className={`block w-4 h-[2px] bg-slate-300 rounded-full transition-all duration-200 ${sidebarOpen ? "opacity-0" : ""}`}
                />
                <span
                  className={`block w-4 h-[2px] bg-slate-300 rounded-full transition-all duration-200 ${sidebarOpen ? "-rotate-45 -translate-y-[7px]" : ""}`}
                />
              </button>
            </header>
          )}

          {/* Mobile drawer */}
          {isMobile && sidebarOpen && (
            <>
              <div
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
                style={{ zIndex: 1800 }}
                onClick={() => setSidebarOpen(false)}
              />
              <div className="fixed top-0 left-0 bottom-0 w-72 flex flex-col" style={{ zIndex: 1900 }}>
                <Sidebar
                  results={results}
                  selectedResult={selectedResult}
                  deletingId={deletingId}
                  onNewCase={() => {
                    setActiveNav("new");
                    setSidebarOpen(false);
                  }}
                  onOpenResult={openResult}
                  onDeleteResult={removeResult}
                  onDeleteAllTestCases={handleDeleteAllTestCases}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* ── Main content ── */}
      <main
        className={`flex-1 overflow-y-auto ${isMobile && hasCases ? "pt-14" : ""}`}>
        {error && (
          <div className="mx-4 mt-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-semibold">
            {error}
          </div>
        )}

        {effectiveNav === "dashboard" && (
          <DashboardView
            {...sharedMapProps}
            mapMode={mapMode}
            setMapMode={setMapMode}
            onNewCase={() => setActiveNav("new")}
            reports={selectedResult?.reports || []}
          />
        )}

        {effectiveNav === "testcases" && (
          <TestCasesView
            {...sharedMapProps}
            results={results}
            deletingId={deletingId}
            onOpenResult={openResult}
            onRemoveResult={removeResult}
          />
        )}

        {effectiveNav === "new" && (
          <NewCaseView
            hasCases={hasCases}
            selectedFile={selectedFile}
            loading={loading}
            onFileChange={setSelectedFile}
            onRunOptimization={runOptimization}
          />
        )}
      </main>
    </div>
  );
}
