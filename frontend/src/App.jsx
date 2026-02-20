import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteResult,
  fetchLatestResult,
  fetchResultDetail,
  fetchResults,
  fetchRoadGeometry,
  optimizeExcel,
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

const NAV_ITEMS = [
  { id: "dashboard", label: "DASHBOARD" },
  { id: "testcases", label: "TEST CASES" },
  { id: "new", label: "NEW TEST CASES" },
];

function LogoMark() {
  return (
    <div className="logo-mark" aria-hidden>
      <img src="/favicon.svg" alt="" className="logo-mark-image" />
    </div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState("new");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760);
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [mapMode, setMapMode] = useState("optimized");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [routeGeometries, setRouteGeometries] = useState({});
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legendVisible, setLegendVisible] = useState(false);

  const hasCases = results.length > 0;
  const effectiveNav = hasCases ? activeNav : "new";

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const [rowsPayload, latestPayload] = await Promise.all([
          fetchResults(),
          fetchLatestResult(),
        ]);
        if (!mounted) return;

        const rows = toResultsListRows(rowsPayload);
        setResults(rows);

        if (rows.length === 0) {
          setActiveNav("new");
          return;
        }

        setActiveNav("dashboard");

        if (latestPayload?.result) {
          setSelectedResult(normalizeOptimizationPayload(latestPayload));
        } else {
          const detail = await fetchResultDetail(rows[0].id);
          if (mounted) setSelectedResult(normalizeOptimizationPayload(detail));
        }
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

  useEffect(() => {
    let cancelled = false;

    async function loadGeometries() {
      const mapData = buildMapData(selectedResult);
      if (mapData.trips.length === 0) {
        setRouteGeometries({});
        setIsRouteLoading(false);
        return;
      }

      setIsRouteLoading(true);

      const entries = await Promise.all(
        mapData.trips.map(async (trip) => {
          try {
            const route = await fetchRoadGeometry(trip.path);
            return [trip.id, route.coordinates || trip.path];
          } catch {
            return [trip.id, trip.path];
          }
        }),
      );

      if (!cancelled) {
        setRouteGeometries(Object.fromEntries(entries));
        setIsRouteLoading(false);
      }
    }

    loadGeometries();
    return () => {
      cancelled = true;
    };
  }, [selectedResult]);

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

  async function runOptimization() {
    if (!selectedFile) {
      setError("Please select an .xlsx file first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const created = await optimizeExcel(selectedFile);
      const normalized = normalizeOptimizationPayload(created);
      setSelectedResult(normalized);
      setVehicleFilter("ALL");
      await refreshResults(normalized.id);
      setActiveNav("dashboard");
    } catch (runErr) {
      setError(runErr.message || "Optimization failed");
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
      setActiveNav(rows.length === 0 ? "new" : "testcases");
    } catch (deleteErr) {
      setError(deleteErr.message || "Unable to delete result");
    } finally {
      setDeletingId(null);
    }
  }

  const metrics = useMemo(() => getMetrics(selectedResult), [selectedResult]);
  const mapData = useMemo(() => buildMapData(selectedResult), [selectedResult]);
  const visibleTrips = useMemo(() => {
    if (vehicleFilter === "ALL") return mapData.trips;
    return mapData.trips.filter((trip) => trip.vehicleId === vehicleFilter);
  }, [mapData.trips, vehicleFilter]);

  // Shared props passed down to all map-bearing views
  const sharedMapProps = {
    mapData,
    vehicleFilter,
    setVehicleFilter,
    routeGeometries,
    isRouteLoading,
    legendVisible,
    setLegendVisible,
    visibleTrips,
    metrics,
    hasCases,
    selectedResult,
  };

  return (
    <div className="frame">
      {hasCases && (
        <>
          {isMobile && (
            <header className="mobile-topbar">
              <div className="mobile-brand">
                <LogoMark />
                <div className="brand-copy">
                  <h2>VELORA</h2>
                  <small>Driven by Possibility</small>
                </div>
              </div>
              <button
                type="button"
                className={sidebarOpen ? "hamburger is-open" : "hamburger"}
                onClick={() => setSidebarOpen((open) => !open)}>
                <span className="hamburger-bar" />
                <span className="hamburger-bar" />
                <span className="hamburger-bar" />
              </button>
            </header>
          )}
          <aside className="side-rail desktop-open">
            <div className="brand-head">
              <LogoMark />
              <div className="brand-copy">
                <h2>VELORA</h2>
                <small>Driven by Possibility</small>
              </div>
            </div>
            <nav>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    effectiveNav === item.id ? "nav-link is-active" : "nav-link"
                  }
                  onClick={() => setActiveNav(item.id)}>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {isMobile && sidebarOpen && (
            <>
              <nav className="mobile-nav-dropdown">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      effectiveNav === item.id
                        ? "nav-link is-active"
                        : "nav-link"
                    }
                    onClick={() => {
                      setActiveNav(item.id);
                      setSidebarOpen(false);
                    }}>
                    {item.label}
                  </button>
                ))}
              </nav>
              <button
                type="button"
                className="sidebar-backdrop"
                onClick={() => setSidebarOpen(false)}
              />
            </>
          )}
        </>
      )}

      <main
        className={
          hasCases ? "content-shell with-nav" : "content-shell no-nav"
        }>
        {error && <div className="error-banner">{error}</div>}

        {effectiveNav === "dashboard" && (
          <DashboardView
            {...sharedMapProps}
            mapMode={mapMode}
            setMapMode={setMapMode}
            onNewCase={() => setActiveNav("new")}
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
