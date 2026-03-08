import MapPanel from "./MapPanel";
import { formatCurrency, formatMinutes, formatNumber } from "../lib/transform";
import ResultsTableView from "./ResultTable";
import TripTimeline from "./TripTimeline";
import AddEmployeeModal from "./AddEmployeeModal";
import ViolationsReport from "./ViolationsReport";
import { useState, useRef } from "react";
import { postDynamicOptimization } from "../api";

/* ── Google Fonts ── */
if (typeof document !== "undefined" && !document.getElementById("db-fonts")) {
  const link = document.createElement("link");
  link.id = "db-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,400&display=swap";
  document.head.appendChild(link);
}

/* ── Icons ── */
const icons = {
  vehicle: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 17H5a2 2 0 01-2-2V9a2 2 0 012-2h1m8 10h3a2 2 0 002-2V9a2 2 0 00-2-2h-1M9 7h6m-7 4h8m-4 6v.01"
      />
    </svg>
  ),
  people: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  route: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  ),
  cost: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  savings: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  ),
  clock: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  plus: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  chevron: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
};

/* ── MetricCard ── */
function MetricCard({ label, value, variant = "default", icon }) {
  const v = {
    default: {
      wrap: "border-[var(--color-border)] hover:border-[var(--color-border-2)] hover:bg-[var(--color-surface-2)]",
      label: "text-[var(--color-text-2)]",
      value: "text-[var(--color-text)]",
      iconWrap: "bg-[var(--color-surface-2)] text-[var(--color-text-2)]",
      leftBorder: "bg-[var(--color-border-2)]",
    },
    gold: {
      wrap: "border-amber-900/50 hover:border-amber-700/50 hover:bg-amber-950/20",
      label: "text-amber-500",
      value: "text-amber-400",
      iconWrap: "bg-amber-950/40 text-amber-500",
      leftBorder: "bg-amber-500",
    },
    green: {
      wrap: "border-emerald-900/50 hover:border-emerald-700/50 hover:bg-emerald-950/20",
      label: "text-emerald-500",
      value: "text-emerald-400",
      iconWrap: "bg-emerald-950/40 text-emerald-500",
      leftBorder: "bg-emerald-500",
    },
  }[variant];

  return (
    <div
      className={`relative rounded-md border p-5 pt-3 flex flex-col gap-3 bg-[var(--color-surface)] ${v.wrap} transition-all duration-200 group overflow-hidden`}>
      {/* Left accent border */}
      <div className={`absolute top-0 left-0 bottom-0 w-[3px] ${v.leftBorder} opacity-70 rounded-l-xl`} />

      <div className="flex items-center justify-between pl-2">
        <p className={`text-[11px] font-bold uppercase tracking-widest ${v.label}`}>
          {label}
        </p>
        {icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${v.iconWrap}`}>
            {icon}
          </div>
        )}
      </div>
      <p className={`text-[1.6rem] font-bold leading-none tracking-tight pl-2 ${v.value}`}>
        {value ?? <span className="text-[var(--color-text-3)] font-normal text-xl">—</span>}
      </p>
    </div>
  );
}

/* ── Section Label ── */
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-[3px] h-4 rounded-full bg-[var(--color-accent)]" />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-2)]">
        {children}
      </span>
      <div className="flex-1 h-px bg-[var(--color-border-2)]" />
    </div>
  );
}

/* ─── StatusBadge ────────────────────────────────────────────── */
function StatusBadge({ children }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      padding: "3px 9px",
      borderRadius: "999px",
      fontSize: "0.6875rem",
      fontWeight: 600,
      background: "rgba(34,197,94,0.1)",
      border: "1px solid rgba(34,197,94,0.2)",
      color: "var(--color-green)",
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--color-green)" }} />
      {children}
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────── */
export default function DashboardView({
  results,
  selectedResult,
  onSelectResult,
  mapMode,
  setMapMode,
  vehicleFilter,
  setVehicleFilter,
  selectedFile,
  setSelectedFile,
  onProcess,
  loading,
  error,
  progress,
  showProgress,
  onDelete,
  mapData,
  routeGeometries,
  isRouteLoading,
  routesLoadedCount,
  totalRoutesCount,
  legendVisible,
  setLegendVisible,
  visibleTrips,
  hasCases,
  onNewCase,
  reports,
  metrics,
  onDynamicOptimize,
}) {
  const mapRef = useRef(null);
  const m = metrics || {};

  const [activeTab, setActiveTab] = useState("map");
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [fitBoundsToggle, setFitBoundsToggle] = useState(0);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

  const handleExportJson = () => {
    if (!selectedResult || !selectedResult.id) return;
    try {
      const cases = JSON.parse(localStorage.getItem('velora_testcases') || '[]');
      const tc = cases.find(c => String(c.id) === String(selectedResult.id));
      if (!tc) {
        alert("Could not find full testcase data in local storage.");
        return;
      }

      const jsonStr = JSON.stringify(tc, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tc.filename.replace('.xlsx', '')}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export JSON", err);
      alert("Failed to export JSON data.");
    }
  };

  // const handleExportPdf = async () => {
  //   if (!selectedResult || !selectedResult.id) return;
  //   try {
  //     let mapImage = null;
  //     if (mapRef.current) {
  //       try {
  //         // Force map to re-center bounds to ensure all routes are in view
  //         setFitBoundsToggle(prev => prev + 1);
  //         await new Promise(r => setTimeout(r, 600)); // wait for Leaflet animation to finish

  //         const mapEl = mapRef.current;

  //         // Higher resolution scale
  //         const scale = 2;
  //         const style = {
  //           transform: `scale(${scale})`,
  //           transformOrigin: 'top left',
  //           width: `${mapEl.offsetWidth}px`,
  //           height: `${mapEl.offsetHeight}px`
  //         };

  //         const filter = (node) => {
  //           // Exclude Leaflet zoom controls and the Legend UI
  //           if (node.classList) {
  //             if (node.classList.contains('leaflet-control-container')) return false;
  //             if (node.classList.contains('legend-container')) return false;
  //           }
  //           return true;
  //         };

  //         mapImage = await domtoimage.toPng(mapEl, {
  //           quality: 1,
  //           bgcolor: '#ffffff',
  //           width: mapEl.offsetWidth * scale,
  //           height: mapEl.offsetHeight * scale,
  //           style,
  //           filter
  //         });
  //       } catch (e) {
  //         console.error("Failed to capture map", e);
  //       }
  //     }

  //     const doc = <TestcasePDF result={selectedResult} mapMode={mapMode} metrics={m} mapImage={mapImage} />;
  //     const asPdf = pdf([]);
  //     asPdf.updateContainer(doc);
  //     const blob = await asPdf.toBlob();

  //     const url = URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     const basename = typeof selectedResult.original_filename === 'string'
  //       ? selectedResult.original_filename
  //       : (typeof selectedResult.filename === 'string' ? selectedResult.filename : 'testcase');
  //     a.download = `${basename.replace('.xlsx', '').replace('.json', '')}_report.pdf`;
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);
  //     URL.revokeObjectURL(url);
  //   } catch (err) {
  //     console.error("Failed to generate PDF", err);
  //     alert("Failed to export PDF report.");
  //   }
  // };

  const handleExportPdf = async () => {
    if (!selectedResult || !selectedResult.id) return;
    try {
      let mapImage = null;
      if (mapRef.current) {
        try {
          // Force map to re-center bounds to ensure all routes are in view
          setFitBoundsToggle(prev => prev + 1);
          await new Promise(r => setTimeout(r, 600)); // wait for Leaflet animation to finish

          const mapEl = mapRef.current;

          // Higher resolution scale
          const scale = 2;
          const style = {
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${mapEl.offsetWidth}px`,
            height: `${mapEl.offsetHeight}px`
          };

          const filter = (node) => {
            // Exclude Leaflet zoom controls and the Legend UI
            if (node.classList) {
              if (node.classList.contains('leaflet-control-container')) return false;
              if (node.classList.contains('legend-container')) return false;
            }
            return true;
          };

          mapImage = await domtoimage.toPng(mapEl, {
            quality: 1,
            bgcolor: '#ffffff',
            width: mapEl.offsetWidth * scale,
            height: mapEl.offsetHeight * scale,
            style,
            filter
          });
        } catch (e) {
          console.error("Failed to capture map", e);
        }
      }

      const doc = <TestcasePDF result={selectedResult} mapMode={mapMode} metrics={m} mapImage={mapImage} />;
      const asPdf = pdf([]);
      asPdf.updateContainer(doc);
      const blob = await asPdf.toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const basename = typeof selectedResult.original_filename === 'string'
        ? selectedResult.original_filename
        : (typeof selectedResult.filename === 'string' ? selectedResult.filename : 'testcase');
      a.download = `${basename.replace('.xlsx', '').replace('.json', '')}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to export PDF report.");
    }
  };

  // Mode labels for metrics sections
  const modeLabels = {
    optimized: "Optimized Routes",
    noconstraints: "No Constraints",
    infeasible: "Hybrid",
    initial: "Initial Points",
  };

  const currentModeLabel = modeLabels[mapMode] || "Optimized Routes";
  const showMetrics = mapMode !== "initial" && selectedResult;

  return (
    <section
      className="min-h-screen"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: "var(--color-bg)",
      }}>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8">
        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Logo badge */}
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "var(--color-accent)",
              }}>
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-500">
                Fleet Intelligence
              </p>
              <h1
                className="text-2xl sm:text-3xl font-bold text-white leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}>
                Route Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                title="Download Export"
                className="cursor-pointer group flex items-center justify-center w-11 h-11 rounded-md bg-slate-800/80 border border-slate-700/60 transition-all duration-300 hover:bg-slate-700/80 hover:border-slate-500/50 hover:-translate-y-0.5 shadow-lg shadow-black/20"
              >
                <svg
                  className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors duration-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {isDownloadMenuOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 40 }}
                    onClick={() => setIsDownloadMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-[calc(100%+8px)] bg-slate-800 border border-slate-700/60 rounded-md shadow-xl p-1.5 min-w-[170px] z-50 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        handleExportPdf();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg bg-transparent border-none text-[13px] font-medium text-slate-300 cursor-pointer transition-colors hover:bg-slate-700/80 hover:text-white"
                    >
                      Export as PDF
                    </button>
                    <button
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        handleExportJson();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg bg-transparent border-none text-[13px] font-medium text-slate-300 cursor-pointer transition-colors hover:bg-slate-700/80 hover:text-white"
                    >
                      Export as JSON
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsAddEmployeeModalOpen(true)}
              className="cursor-pointer group relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-bold text-sm tracking-wide text-white overflow-hidden transition-all duration-300 shadow-lg shadow-amber-900/20 hover:shadow-amber-900/40 hover:-translate-y-0.5"
              style={{
                background: "var(--color-accent)"
              }}>
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Employee
            </button>
          </div>
        </header>

        {/* ── Map Card ── */}
        <div className="rounded-lg border overflow-hidden" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          {/* Toolbar */}
          <div className="flex flex-row flex-wrap sm:flex-nowrap items-center justify-between gap-4 px-6 py-4 border-b overflow-x-auto no-scrollbar" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 w-full sm:w-auto">
              <span className="hidden lg:inline text-[11px] font-bold text-slate-500 uppercase tracking-widest flex-shrink-0">
                Map View
              </span>
              {/* Toggle group */}
              <div className="flex items-center rounded-md p-1 gap-0.5 border w-full sm:w-auto" style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}>
                {[
                  {
                    key: "initial",
                    label: "Initial Points",
                    shortLabel: "Initial",
                  },
                  {
                    key: "optimized",
                    label: "Optimized Routes",
                    shortLabel: "Optimized",
                  },
                  {
                    key: "noconstraints",
                    label: "No Constraints",
                    shortLabel: "No Const.",
                  },
                  {
                    key: "infeasible",
                    label: "Hybrid",
                    shortLabel: "Hybrid",
                  },
                ].map(({ key, label, shortLabel }) => {
                  const active = mapMode === key;
                  const disabled = key !== "initial" && !selectedResult;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => !disabled && setMapMode(key)}
                      disabled={disabled}
                      className={`
                        px-2.5 sm:px-3 xl:px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none flex-shrink-0
                        ${active
                          ? "text-white"
                          : disabled
                            ? "cursor-not-allowed"
                            : "hover:text-white"
                        }
                      `}
                      style={{
                        color: active ? "#fff" : disabled ? "var(--color-text-3)" : "var(--color-text-2)",
                        background: active ? "var(--color-accent)" : "transparent",
                      }}>
                      <span className="hidden 2xl:inline">{label}</span>
                      <span className="2xl:hidden">{shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative hidden 2xl:block flex-shrink-0">
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                disabled={!selectedResult}
                className="appearance-none pl-4 pr-9 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                style={{ background: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text-2)" }}>
                <option value="ALL">Combined View</option>
                {(mapData?.vehicles ?? []).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-3)" }}>
                {icons.chevron}
              </span>
            </div>
          </div>

          {/* Map */}
          <div ref={mapRef} className="relative" style={{ minHeight: 460 }}>
            {isRouteLoading && (
              <div className="map-loading-overlay">
                <div className="map-loading-card">
                  <div className="map-loading-spinner" />
                  <strong>Rendering road geometry…</strong>
                  {totalRoutesCount > 0 && (
                    <>
                      <div className="map-loading-progress-bar">
                        <div className="map-loading-progress-fill"
                          style={{ width: `${(routesLoadedCount / totalRoutesCount) * 100}%` }} />
                      </div>
                      <small className="map-loading-count">
                        {routesLoadedCount} / {totalRoutesCount} routes
                      </small>
                    </>
                  )}
                  {totalRoutesCount === 0 && <small>Please wait…</small>}
                </div>
              </div>
            )}
            <MapPanel
              mapData={mapData}
              mode={mapMode}
              tripFilter={vehicleFilter}
              routeGeometries={routeGeometries}
              isRouteLoading={isRouteLoading}
              routesLoadedCount={routesLoadedCount}
              totalRoutesCount={totalRoutesCount}
              legendVisible={legendVisible}
              setLegendVisible={setLegendVisible}
              visibleTrips={visibleTrips}
              fitBoundsToggle={fitBoundsToggle}
            />
          </div>
        </div>

        {/* ── Metrics ── */}
        <div className="space-y-8">
          {showMetrics && (
            <div>
              <SectionLabel>
                Fleet Overview{" "}
                <span className="text-amber-500">· {currentModeLabel}</span>
              </SectionLabel>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Vehicles Used"
                  value={formatNumber(m.vehicles_used)}
                  icon={icons.vehicle}
                />
                <MetricCard
                  label="Employees Covered"
                  value={formatNumber(m.employees_covered)}
                  icon={icons.people}
                />
                <MetricCard
                  label="Total Distance"
                  value={
                    m.total_distance_km != null
                      ? `${formatNumber(m.total_distance_km)} km`
                      : null
                  }
                  icon={icons.route}
                />
                <MetricCard
                  label="Total Cost"
                  value={formatCurrency(m.total_cost)}
                  icon={icons.cost}
                  variant="gold"
                />
              </div>
            </div>
          )}

          {/* ── Savings Analysis ── */}
          {showMetrics && (
            <div>
              <SectionLabel>Savings Analysis — {currentModeLabel}</SectionLabel>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Baseline Cost" value={formatCurrency(m.baseline_cost)} icon={icons.cost} />
                <MetricCard label="Net Savings" value={formatCurrency(m.net_savings)} icon={icons.savings} variant="green" />
                <MetricCard label="Savings %" value={m.savings_percentage != null ? `${formatNumber(m.savings_percentage)}%` : null} icon={icons.savings} variant="green" />
                <MetricCard label="Optimized Time" value={formatMinutes(m.optimized_travel_time_min)} icon={icons.clock} variant="gold" />
                <MetricCard label="Baseline Time" value={formatMinutes(m.baseline_travel_time_min)} icon={icons.clock} />
              </div>
            </div>
          )}

          {selectedResult && (
            <ResultsTableView
              key={selectedResult.id}
              selectedResult={selectedResult}
              mapMode={mapMode}
            />
          )}

          {/* ── Trip Timeline ── */}
          {visibleTrips?.length > 0 && (
            <div>
              <SectionLabel>Trip Timeline</SectionLabel>
              <TripTimeline
                trips={mapData.trips}
                title={vehicleFilter === "ALL" ? "All Vehicles" : vehicleFilter}
              />
            </div>
          )}
          {selectedResult?.evaluations && (
            <div>
              <ViolationsReport
                evaluations={selectedResult.evaluations}
                mapMode={mapMode}
              />
            </div>
          )}

          {/* ── Footer ── */}
          <footer className="flex items-center justify-center gap-3 pt-2 pb-8">
            <div className="h-px w-12 bg-slate-700/60" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
              Route Optimizer · Fleet Intelligence
            </span>
            <div className="h-px w-12 bg-slate-700/60" />
          </footer>
        </div>
      </div>

      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        onSubmit={async (newEmployees) => {
          setIsAddEmployeeModalOpen(false);
          try {
            if (onDynamicOptimize) {
              await onDynamicOptimize(newEmployees);
            }
          } catch (err) {
            console.error(err);
            if (err?.showAlert) {
              alert(err.message);
            }
          }
        }}
      />
    </section>
  );
}
