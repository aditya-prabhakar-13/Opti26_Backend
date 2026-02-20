import MapPanel from "./MapPanel";
import StatCard from "./StatCard";
import { formatCurrency, formatNumber } from "../lib/transform";

export default function TestCasesView({
  results,
  selectedResult,
  mapData,
  vehicleFilter,
  routeGeometries,
  legendVisible,
  setLegendVisible,
  visibleTrips,
  metrics,
  deletingId,
  onOpenResult,
  onRemoveResult,
}) {
  return (
    <section className="page testcase-page">
      <h1>TEST CASES</h1>
      <div className="testcase-layout">
        <aside className="testcase-list">
          <h2>AVAILABLE RUNS</h2>
          {results.length === 0 && <p className="muted">No cases found yet.</p>}
          {results.map((row) => (
            <div
              key={row.id}
              className={
                selectedResult?.id === row.id
                  ? "case-row-shell is-selected"
                  : "case-row-shell"
              }>
              <button
                type="button"
                className="case-row-main"
                onClick={() => onOpenResult(row.id)}>
                <span>{row.filename}</span>
                <small>{new Date(row.createdAt).toLocaleString()}</small>
              </button>
              <button
                type="button"
                className="case-delete"
                onClick={() => onRemoveResult(row.id)}
                disabled={deletingId === row.id}
                aria-label={`Remove ${row.filename}`}
                title="Remove test case">
                {deletingId === row.id ? (
                  "⋯"
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                )}
              </button>
            </div>
          ))}
        </aside>

        <div className="testcase-detail">
          <div className="testcase-map-box">
            <MapPanel
              mapData={mapData}
              mode="optimized"
              tripFilter={vehicleFilter}
              routeGeometries={routeGeometries}
              legendVisible={legendVisible}
              setLegendVisible={setLegendVisible}
              visibleTrips={visibleTrips}
            />
          </div>
          <div className="stats-grid compact">
            <StatCard
              label="VEHICLES USED"
              value={formatNumber(metrics.vehicles_used)}
            />
            <StatCard
              label="EMPLOYEES COVERED"
              value={formatNumber(metrics.employees_covered)}
            />
            <StatCard
              label="TOTAL DISTANCE"
              value={`${formatNumber(metrics.total_distance_km)} km`}
            />
            <StatCard
              label="TOTAL COST"
              value={formatCurrency(metrics.total_cost)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
