import MapPanel from "./MapPanel";
import { formatCurrency, formatMinutes, formatNumber } from "../lib/transform";
import ResultsTableView from "./ResultTable";
import TripTimeline from "./TripTimeline";

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
      wrap: "bg-slate-800/60 border-slate-700/60 hover:border-slate-600/80 hover:bg-slate-800/90",
      label: "text-slate-400",
      value: "text-white",
      iconWrap: "bg-slate-700/80 text-slate-300",
      glow: "",
      accent: "bg-gradient-to-r from-slate-600 to-transparent",
    },
    gold: {
      wrap: "bg-amber-500/10 border-amber-500/30 hover:border-amber-400/60 hover:bg-amber-500/15",
      label: "text-amber-400",
      value: "text-amber-300",
      iconWrap: "bg-amber-500/20 text-amber-400",
      glow: "shadow-amber-900/30",
      accent: "bg-gradient-to-r from-amber-400 to-orange-400",
    },
    green: {
      wrap: "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/15",
      label: "text-emerald-400",
      value: "text-emerald-300",
      iconWrap: "bg-emerald-500/20 text-emerald-400",
      glow: "shadow-emerald-900/30",
      accent: "bg-gradient-to-r from-emerald-400 to-teal-400",
    },
  }[variant];

  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col gap-3 shadow-lg ${v.wrap} ${v.glow} transition-all duration-250 group overflow-hidden`}>
      {/* top accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] ${v.accent} opacity-80`}
      />

      {/* decorative circle */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full border border-white/5 opacity-60" />
      <div className="absolute -right-2 -bottom-2 w-12 h-12 rounded-full border border-white/5 opacity-40" />

      <div className="flex items-center justify-between">
        <p
          className={`text-[11px] font-bold uppercase tracking-widest ${v.label}`}>
          {label}
        </p>
        {icon && (
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${v.iconWrap}`}>
            {icon}
          </div>
        )}
      </div>
      <p
        className={`text-[1.6rem] font-bold leading-none tracking-tight ${v.value}`}>
        {value ?? <span className="text-slate-600 font-normal text-xl">—</span>}
      </p>
    </div>
  );
}

/* ── Section Label ── */
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-amber-400 to-orange-400" />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {children}
      </span>
      <div className="flex-1 h-px bg-slate-700/60" />
    </div>
  );
}

/* ── Main Dashboard ── */
export default function DashboardView({
  mapData,
  mapMode,
  setMapMode,
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
  onNewCase,
  reports,
}) {
  const m = metrics ?? {};

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
        background:
          "linear-gradient(135deg, #0f1623 0%, #111827 50%, #0c1420 100%)",
      }}>
      {/* Mesh glow blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{
            background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{
            background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(circle, #34d399 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8">
        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Logo badge */}
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-900/40 flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #ea580c)",
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

          <button
            type="button"
            onClick={onNewCase}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}>
            {icons.plus}
            New Test Case
          </button>
        </header>

        {/* ── Map Card ── */}
        <div className="rounded-3xl border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm shadow-2xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-row flex-wrap sm:flex-nowrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-700/50 bg-slate-800/40 no-scrollbar">
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 w-full sm:w-auto ">
              <span className="hidden lg:inline text-[11px] font-bold text-slate-500 uppercase tracking-widest flex-shrink-0">
                Map View
              </span>
              {/* Toggle group */}
              <div className="flex items-center bg-slate-900/70 rounded-xl p-1 gap-0.5 border border-slate-700/50 w-full sm:w-auto ">
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
                        px-2.5 sm:px-3 xl:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold tracking-wide transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none flex-shrink-0
                        ${active
                          ? "text-slate-900 shadow-sm shadow-amber-900/30"
                          : disabled
                            ? "text-slate-600 cursor-not-allowed"
                            : "text-slate-400 hover:text-slate-200"
                        }
                      `}
                      style={
                        active
                          ? {
                            background:
                              "linear-gradient(135deg, #f59e0b, #ea580c)",
                          }
                          : {}
                      }>
                      <span className="hidden 2xl:inline">{label}</span>
                      <span className="2xl:hidden">{shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vehicle select desktop - only for very large screens */}
            <div className="relative hidden 2xl:block flex-shrink-0">
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                disabled={!selectedResult}
                className="appearance-none pl-4 pr-9 py-2 rounded-xl bg-slate-900/70 border border-slate-700/60 text-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all">
                <option value="ALL">Combined View</option>
                {(mapData?.vehicles ?? []).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {icons.chevron}
              </span>
            </div>
          </div>

          {/* Map */}
          <div className="relative" style={{ minHeight: 460 }}>
            {isRouteLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-[3px] border-amber-900/40 border-t-amber-400 animate-spin" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Optimizing routes…
                  </p>
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
            />
          </div>

          {/* Bottom vehicle select (for all but 2xl screens) */}
          <div className="2xl:hidden px-5 py-4 border-t border-slate-700/50 bg-slate-800/40">
            <div className="relative">
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                disabled={!selectedResult}
                className="w-full appearance-none px-4 py-2.5 rounded-xl bg-slate-900/70 border border-slate-700/60 text-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-30">
                <option value="ALL">Combined View</option>
                {(mapData?.vehicles ?? []).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {icons.chevron}
              </span>
            </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

          {showMetrics && (
            <div>
              <SectionLabel>
                Savings Analysis{" "}
                <span className="text-amber-500">· {currentModeLabel}</span>
              </SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCard
                  label="Baseline Cost"
                  value={formatCurrency(m.baseline_cost)}
                  icon={icons.cost}
                />
                <MetricCard
                  label="Net Savings"
                  value={formatCurrency(m.net_savings)}
                  icon={icons.savings}
                  variant="green"
                />
                <MetricCard
                  label="Savings %"
                  value={
                    m.savings_percentage != null
                      ? `${formatNumber(m.savings_percentage)}%`
                      : null
                  }
                  icon={icons.savings}
                  variant="green"
                />
                <MetricCard
                  label="Optimized Time"
                  value={formatMinutes(m.optimized_travel_time_min)}
                  icon={icons.clock}
                  variant="gold"
                />
                <MetricCard
                  label="Baseline Time"
                  value={formatMinutes(m.baseline_travel_time_min)}
                  icon={icons.clock}
                />
              </div>
            </div>
          )}
        </div>

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
        {/* 
        <div>
          <SectionLabel>Infeasibility Report</SectionLabel>
          <InfeasibilityReport report={reports.reportInfeasible} />
        </div> */}

        {/* ── Footer ── */}
        <footer className="flex items-center justify-center gap-3 pt-2 pb-8">
          <div className="h-px w-12 bg-slate-700/60" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
            Route Optimizer · Fleet Intelligence
          </span>
          <div className="h-px w-12 bg-slate-700/60" />
        </footer>
      </div>
    </section>
  );
}
