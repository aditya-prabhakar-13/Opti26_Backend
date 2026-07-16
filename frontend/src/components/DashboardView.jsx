import MapPanel from "./MapPanel";
import { formatCurrency, formatMinutes, formatNumber } from "../lib/transform";
import ResultsTableView from "./ResultTable";
import TripTimeline from "./TripTimeline";
import AddEmployeeModal from "./AddEmployeeModal";
import ViolationsReport from "./ViolationsReport";
import { useState, useRef } from "react";
import { postDynamicOptimization } from "../api";
import domtoimage from 'dom-to-image';
import { pdf } from '@react-pdf/renderer';
import { TestcasePDF } from './PDFReport';


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

/* ── Horizontal Stat (no card, vertical-divider style from mockup) ── */
function StatItem({ label, value, accent = false, isFirst = false }) {
  return (
    <div
      className={`flex-1 min-w-0 flex flex-col gap-2 py-1 ${isFirst ? "" : "sm:pl-7"} ${isFirst ? "" : "sm:border-l"} sm:pr-4`}
      style={{
        borderColor: "var(--color-rule)",
      }}>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap overflow-hidden text-ellipsis"
        style={{
          color: "var(--color-muted)",
          fontFamily: "var(--font-body)",
        }}>
        {label}:
      </p>
      <p
        className="text-[1.85rem] font-light leading-none tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"
        style={{
          color: accent ? "var(--color-accent-text)" : "var(--color-ink)",
          fontFamily: "var(--font-display)",
          fontWeight: 500,
        }}>
        {value ?? <span style={{ color: "var(--color-faint)" }}>—</span>}
      </p>
    </div>
  );
}

/* ── Section Label (uppercase, minimal) ── */
function SectionLabel({ children }) {
  return (
    <div className="mb-5 pb-3" style={{ borderBottom: "1px solid var(--color-rule)" }}>
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{
          color: "var(--color-muted)",
          fontFamily: "var(--font-body)",
        }}>
        {children}
      </span>
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
      background: "var(--color-green-soft)",
      border: "1px solid var(--color-green)",
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
        fontFamily: "var(--font-body)",
        background: "var(--color-bg)",
      }}>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 py-10 space-y-10">
        {/* ── Header (Image 1: large serif title + uppercase sub-label) ── */}
        <header className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
          <div className="min-w-0">
            <h1
              className="leading-[1.05] tracking-tight"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                fontSize: "clamp(2rem, 4vw, 3.1rem)",
              }}>
              Velora Fleet Analytics Dashboard
            </h1>
            <p
              className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{
                color: "var(--color-muted)",
                fontFamily: "var(--font-body)",
              }}>
              Fleet Overview
              {selectedResult?.filename && (
                <span style={{ color: "var(--color-faint)" }}>
                  {" · "}
                  <span style={{ color: "var(--color-ink-2)" }}>
                    {selectedResult.filename}
                  </span>
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end">
            <div style={{ position: "relative" }} >
              <button
                onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                title="Download Export"
                className="cursor-pointer group flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200"
                style={{
                  background: "transparent",
                  border: "1px solid var(--color-rule-2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                  e.currentTarget.style.background = "var(--color-accent-soft)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-rule-2)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <svg
                  className="w-4 h-4 transition-colors duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  style={{ color: "var(--color-ink-2)" }}
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
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] rounded-md p-1.5 min-w-[170px] z-50 flex flex-col gap-1"
                    style={{
                      background: "var(--color-paper-2)",
                      border: "1px solid var(--color-rule)",
                      boxShadow: "var(--shadow-lg)",
                    }}>
                    <button
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        handleExportPdf();
                      }}
                      className="w-full text-left px-3 py-2 rounded bg-transparent border-none text-[13px] cursor-pointer transition-colors"
                      style={{ color: "var(--color-ink-2)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--color-paper-3)";
                        e.currentTarget.style.color = "var(--color-ink)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--color-ink-2)";
                      }}
                    >
                      Export as PDF
                    </button>
                    <button
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        handleExportJson();
                      }}
                      className="w-full text-left px-3 py-2 rounded bg-transparent border-none text-[13px] cursor-pointer transition-colors"
                      style={{ color: "var(--color-ink-2)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--color-paper-3)";
                        e.currentTarget.style.color = "var(--color-ink)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--color-ink-2)";
                      }}
                    >
                      Export as JSON
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsAddEmployeeModalOpen(true)}
              className="cursor-pointer flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[13px] tracking-wide transition-all duration-200"
              style={{
                background: "transparent",
                border: "1px solid var(--color-accent)",
                color: "var(--color-accent-text)",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-accent-soft)";
                e.currentTarget.style.borderColor = "var(--color-accent-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "var(--color-accent)";
              }}>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Employee
            </button>
          </div>
        </header>

        {/* ── Fleet Overview Stats Strip (Image 1: horizontal, vertical dividers, no cards) ── */}
        {showMetrics && (
          <div>
            <SectionLabel>
              Fleet Overview
              {selectedResult?.filename && (
                <span style={{ color: "var(--color-faint)" }}>
                  {"  ·  "}
                  <span style={{ color: "var(--color-muted)" }}>{selectedResult.filename}</span>
                </span>
              )}
            </SectionLabel>
            <div className="flex flex-col sm:flex-row items-stretch gap-y-4">
              <StatItem
                label="Vehicles Used"
                value={formatNumber(m.vehicles_used)}
                isFirst
              />
              <StatItem
                label="Employees Covered"
                value={formatNumber(m.employees_covered)}
              />
              <StatItem
                label="Total Distance"
                value={
                  m.total_distance_km != null
                    ? `${formatNumber(m.total_distance_km)} km`
                    : null
                }
              />
              <StatItem
                label="Total Objective Cost"
                value={formatCurrency(m.total_cost)}
                accent
              />
            </div>
          </div>
        )}

        {/* ── Map Card ── */}
        <div
          className="rounded-md overflow-hidden"
          style={{
            background: "var(--color-paper-2)",
            border: "1px solid var(--color-rule)",
          }}>
          {/* Toolbar — Image 1 "VIEWS:" style, right-aligned, minimal pills */}
          <div
            className="flex flex-row flex-wrap items-center justify-between gap-3 px-5 py-3 no-scrollbar"
            style={{
              borderBottom: "1px solid var(--color-rule)",
              background: "transparent",
            }}>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  color: "var(--color-muted)",
                  fontFamily: "var(--font-body)",
                }}>
                Views:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { key: "initial", label: "Initial", shortLabel: "Initial" },
                  { key: "optimized", label: "Efficiency", shortLabel: "Eff." },
                  { key: "noconstraints", label: "Cost", shortLabel: "Cost" },
                  { key: "infeasible", label: "Hybrid", shortLabel: "Hybrid" },
                ].map(({ key, label, shortLabel }) => {
                  const active = mapMode === key;
                  const disabled = key !== "initial" && !selectedResult;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => !disabled && setMapMode(key)}
                      disabled={disabled}
                      className="px-3 py-1 rounded-full text-[12px] tracking-tight transition-all duration-200 whitespace-nowrap flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      style={{
                        fontFamily: "var(--font-body)",
                        fontWeight: active ? 600 : 500,
                        color: active
                          ? "var(--color-accent-ink)"
                          : disabled
                            ? "var(--color-faint)"
                            : "var(--color-ink-2)",
                        background: active ? "var(--color-accent)" : "transparent",
                        border: active
                          ? "1px solid var(--color-accent)"
                          : "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!active && !disabled) {
                          e.currentTarget.style.color = "var(--color-ink)";
                          e.currentTarget.style.background =
                            "var(--color-paper-3)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active && !disabled) {
                          e.currentTarget.style.color = "var(--color-ink-2)";
                          e.currentTarget.style.background = "transparent";
                        }
                      }}>
                      <span className="hidden lg:inline">{label}</span>
                      <span className="lg:hidden">{shortLabel}</span>
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
                className="appearance-none pl-4 pr-9 py-1.5 rounded-full text-[12px] focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                style={{
                  background: "transparent",
                  border: "1px solid var(--color-rule-2)",
                  color: "var(--color-ink-2)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                }}>
                <option value="ALL">Combined View</option>
                {(mapData?.vehicles ?? []).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-muted)" }}>
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
        <div className="space-y-10">
          {/* ── Savings Analysis (horizontal strip, matching Fleet Overview) ── */}
          {showMetrics && (
            <div>
              <SectionLabel>
                Savings Analysis
                <span style={{ color: "var(--color-faint)" }}>
                  {"  ·  "}
                  <span style={{ color: "var(--color-muted)" }}>
                    {currentModeLabel}
                  </span>
                </span>
              </SectionLabel>
              <div className="flex flex-col sm:flex-row items-stretch gap-y-4 flex-wrap">
                <StatItem
                  label="Baseline Cost"
                  value={formatCurrency(m.baseline_cost)}
                  isFirst
                />
                <StatItem
                  label="Net Savings"
                  value={formatCurrency(m.net_savings)}
                  accent
                />
                <StatItem
                  label="Savings %"
                  value={
                    m.savings_percentage != null
                      ? `${formatNumber(m.savings_percentage)}%`
                      : null
                  }
                  accent
                />
                <StatItem
                  label="Optimized Time"
                  value={formatMinutes(m.optimized_travel_time_min)}
                />
                <StatItem
                  label="Baseline Time"
                  value={formatMinutes(m.baseline_travel_time_min)}
                />
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
          <footer className="flex items-center justify-center gap-3 pt-4 pb-10">
            <div className="h-px w-12" style={{ background: "var(--color-rule-2)" }} />
            <span
              className="text-[10px] font-medium uppercase tracking-[0.22em]"
              style={{
                color: "var(--color-faint)",
                fontFamily: "var(--font-body)",
              }}>
              Velora · Fleet Intelligence
            </span>
            <div className="h-px w-12" style={{ background: "var(--color-rule-2)" }} />
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
