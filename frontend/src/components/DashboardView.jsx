import MapPanel from "./MapPanel";
import { formatCurrency, formatMinutes, formatNumber } from "../lib/transform";
import ResultsTableView from "./ResultTable";
import TripTimeline from "./TripTimeline";
import AddEmployeeModal from "./AddEmployeeModal";
import ViolationsReport from "./ViolationsReport";
import { useState, useRef } from "react";
import { pdf } from '@react-pdf/renderer';
import domtoimage from "dom-to-image";
import { Download, UploadCloud, RefreshCw, Trash2, Map } from "lucide-react";
import { TestcasePDF } from './PDFReport';

/* ─── Icon primitive ─────────────────────────────────────────── */
function Icon({ d, size = 16, strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const I = {
  vehicle: "M8 17H5a2 2 0 01-2-2V9a2 2 0 012-2h1m8 10h3a2 2 0 002-2V9a2 2 0 00-2-2h-1M9 7h6m-7 4h8m-4 6v.01",
  people: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  route: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  cost: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  savings: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  plus: "M12 4v16m8-8H4",
  download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  chevron: "M19 9l-7 7-7-7",
};

/* ─── MetricCard ─────────────────────────────────────────────── */
function MetricCard({ label, value, icon, accentColor }) {
  const isAccented = !!accentColor;
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "10px",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        transition: "border-color 150ms ease, background 150ms ease",
        cursor: "default",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--color-border-2)";
        e.currentTarget.style.background = "var(--color-surface-2)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.background = "var(--color-surface)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span style={{
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-text-3)",
        }}>
          {label}
        </span>
        {icon && (
          <div style={{ color: isAccented ? accentColor : "var(--color-text-3)", opacity: 0.8, flexShrink: 0 }}>
            <Icon d={icon} size={13} />
          </div>
        )}
      </div>
      <p style={{
        margin: 0,
        fontSize: "1.375rem",
        fontWeight: 700,
        letterSpacing: "-0.025em",
        lineHeight: 1,
        color: isAccented ? accentColor : "var(--color-text)",
      }}>
        {value ?? <span style={{ color: "var(--color-text-3)", fontWeight: 400, fontSize: "1rem" }}>—</span>}
      </p>
    </div>
  );
}

/* ─── SectionLabel ───────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "14px",
    }}>
      <span style={{
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--color-text-3)",
        whiteSpace: "nowrap",
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
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

  const modeLabels = {
    optimized: "Optimized",
    noconstraints: "No Constraints",
    infeasible: "Hybrid",
    initial: "Initial Points",
  };

  const currentModeLabel = modeLabels[mapMode] || "Optimized";
  const showMetrics = mapMode !== "initial" && selectedResult;

  const handleExportJson = () => {
    if (!selectedResult?.id) return;
    try {
      const cases = JSON.parse(localStorage.getItem("velora_testcases") || "[]");
      const tc = cases.find(c => String(c.id) === String(selectedResult.id));
      if (!tc) { alert("Could not find testcase data in storage."); return; }
      const blob = new Blob([JSON.stringify(tc, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tc.filename.replace(".xlsx", "")}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert("Failed to export data."); }
  };

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

  const mapModeTabs = [
    { key: "initial", label: "Initial Points" },
    { key: "optimized", label: "Optimized" },
    { key: "noconstraints", label: "No Constraints" },
    { key: "infeasible", label: "Hybrid" },
  ];

  return (
    <section style={{
      minHeight: "100vh",
      background: "var(--color-bg)",
      fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
    }}>
      {/* ── Page wrapper ── */}
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "28px 20px 64px",
      }}>
        <style>{`
          @media (max-width: 767px) {
            .db-page-wrap { padding-top: 68px !important; }
            .db-desktop-header { display: none !important; }
            .db-map-canvas { min-height: 280px !important; max-height: 60vh !important; }
          }
        `}</style>
        <div
          className="db-page-wrap"
          style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >

          {/* ── Header ── */}
          <header className="db-desktop-header" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            paddingBottom: "20px",
            borderBottom: "1px solid var(--color-border)",
          }}>
            {/* Left: title + badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <h1 style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--color-text)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.3,
                }}>
                  Route Dashboard
                </h1>
                {selectedResult?.filename && (
                  <p style={{
                    margin: "2px 0 0",
                    fontSize: "0.8125rem",
                    color: "var(--color-text-3)",
                    fontWeight: 400,
                  }}>
                    {selectedResult.filename}
                  </p>
                )}
              </div>
              {selectedResult && <StatusBadge>Optimization complete</StatusBadge>}
            </div>

            <div className="flex items-center gap-3">
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                  title="Download"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border-2)",
                    background: "var(--color-surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--color-text-2)",
                    transition: "all 120ms ease",
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "var(--color-surface-2)";
                    e.currentTarget.style.color = "var(--color-text)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "var(--color-surface)";
                    e.currentTarget.style.color = "var(--color-text-2)";
                  }}
                >
                  <Icon d={I.download} size={13} />
                </button>

                {isDownloadMenuOpen && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 40 }}
                      onClick={() => setIsDownloadMenuOpen(false)}
                    />
                    <div style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border-2)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      padding: "4px",
                      minWidth: "160px",
                      zIndex: 50,
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px"
                    }}>
                      <button
                        onClick={() => {
                          setIsDownloadMenuOpen(false);
                          handleExportPdf();
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 12px",
                          borderRadius: "4px",
                          background: "transparent",
                          border: "none",
                          fontSize: "0.8125rem",
                          color: "var(--color-text)",
                          cursor: "pointer",
                          transition: "background 120ms"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--color-surface-2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        Export as PDF
                      </button>
                      <button
                        onClick={() => {
                          setIsDownloadMenuOpen(false);
                          handleExportJson();
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 12px",
                          borderRadius: "4px",
                          background: "transparent",
                          border: "none",
                          fontSize: "0.8125rem",
                          color: "var(--color-text)",
                          cursor: "pointer",
                          transition: "background 120ms"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--color-surface-2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        Export as JSON
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setIsAddEmployeeModalOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "6px",
                  background: "var(--color-accent)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "-0.01em",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-h)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent)"}
              >
                <Icon d={I.plus} size={12} strokeWidth={2.5} />
                Add Employee
              </button>
            </div>
          </header>


          {/* ── Map Card ── */}
          <div style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            overflow: "hidden",
          }}>
            {/* Toolbar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "10px 14px",
              borderBottom: "1px solid var(--color-border)",
              flexWrap: "wrap",
            }}>
              {/* Left: label + mode tabs */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-text-3)",
                  flexShrink: 0,
                }}>
                  Map View
                </span>
                {/* Segmented control */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--color-bg)",
                  borderRadius: "6px",
                  padding: "2px",
                  gap: "2px",
                  border: "1px solid var(--color-border)",
                }}>
                  {mapModeTabs.map(({ key, label }) => {
                    const active = mapMode === key;
                    const disabled = key !== "initial" && !selectedResult;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => !disabled && setMapMode(key)}
                        disabled={disabled}
                        style={{
                          padding: "4px 11px",
                          borderRadius: "4px",
                          border: active ? "1px solid var(--color-border)" : "1px solid transparent",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          cursor: disabled ? "not-allowed" : "pointer",
                          transition: "all 120ms ease",
                          background: active ? "var(--color-surface-2)" : "transparent",
                          color: active
                            ? "var(--color-text)"
                            : disabled
                              ? "var(--color-text-3)"
                              : "var(--color-text-2)",
                          boxShadow: active ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: vehicle filter */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <select
                  value={vehicleFilter}
                  onChange={e => setVehicleFilter(e.target.value)}
                  disabled={!selectedResult}
                  style={{
                    appearance: "none",
                    paddingLeft: "10px",
                    paddingRight: "28px",
                    paddingTop: "5px",
                    paddingBottom: "5px",
                    borderRadius: "6px",
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-2)",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    cursor: selectedResult ? "pointer" : "not-allowed",
                    opacity: selectedResult ? 1 : 0.4,
                    outline: "none",
                    transition: "border-color 120ms ease",
                  }}
                >
                  <option value="ALL">All Vehicles</option>
                  {(mapData?.vehicles ?? []).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <span style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--color-text-3)",
                }}>
                  <Icon d={I.chevron} size={10} />
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

          {/* ── Fleet Overview Metrics ── */}
          {showMetrics && (
            <div>
              <SectionLabel>Fleet Overview — {currentModeLabel}</SectionLabel>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "12px",
              }}>
                <MetricCard label="Vehicles Used" value={formatNumber(m.vehicles_used)} icon={I.vehicle} />
                <MetricCard label="Employees Covered" value={formatNumber(m.employees_covered)} icon={I.people} />
                <MetricCard label="Total Distance" value={m.total_distance_km != null ? `${formatNumber(m.total_distance_km)} km` : null} icon={I.route} />
                <MetricCard label="Total Cost" value={formatCurrency(m.total_cost)} icon={I.cost} accentColor="var(--color-amber)" />
              </div>
            </div>
          )}

          {/* ── Savings Analysis ── */}
          {showMetrics && (
            <div>
              <SectionLabel>Savings Analysis — {currentModeLabel}</SectionLabel>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "12px",
              }}>
                <MetricCard label="Baseline Cost" value={formatCurrency(m.baseline_cost)} icon={I.cost} />
                <MetricCard label="Net Savings" value={formatCurrency(m.net_savings)} icon={I.savings} accentColor="var(--color-green)" />
                <MetricCard label="Savings %" value={m.savings_percentage != null ? `${formatNumber(m.savings_percentage)}%` : null} icon={I.savings} accentColor="var(--color-green)" />
                <MetricCard label="Optimized Time" value={formatMinutes(m.optimized_travel_time_min)} icon={I.clock} accentColor="var(--color-amber)" />
                <MetricCard label="Baseline Time" value={formatMinutes(m.baseline_travel_time_min)} icon={I.clock} />
              </div>
            </div>
          )}

          {/* ── Results Table ── */}
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

          {/* ── Violations ── */}
          {selectedResult?.evaluations && (
            <ViolationsReport
              evaluations={selectedResult.evaluations}
              mapMode={mapMode}
            />
          )}

        </div>{/* /db-page-wrap */}
      </div>{/* /maxWidth wrapper */}

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
