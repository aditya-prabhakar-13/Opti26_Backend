import MapPanel from "./MapPanel";
import StatCard from "./StatCard";
import { formatCurrency, formatMinutes, formatNumber } from "../lib/transform";

export default function DashboardView({
  mapData,
  mapMode,
  setMapMode,
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
  onNewCase,
}) {
  return (
    <section className="page dashboard-page">
      <div className="toolbar-row">
        <h1>MAPS:</h1>
      </div>

      <div className="map-card">
        <div className="map-controls">
          <div className="map-control-buttons">
            <button
              type="button"
              className={mapMode === "initial" ? "is-active" : ""}
              onClick={() => setMapMode("initial")}>
              Initial Points
            </button>
            <button
              type="button"
              className={mapMode === "optimized" ? "is-active" : ""}
              onClick={() => setMapMode("optimized")}
              disabled={!selectedResult}>
              Optimized Routes
            </button>
          </div>
          <div className="map-control-select map-control-select-desktop">
            <select
              value={vehicleFilter}
              onChange={(event) => setVehicleFilter(event.target.value)}
              disabled={!selectedResult}>
              <option value="ALL">Combined View</option>
              {mapData.vehicles.map((vehicleId) => (
                <option key={vehicleId} value={vehicleId}>
                  {vehicleId}
                </option>
              ))}
            </select>
          </div>
        </div>
        <MapPanel
          mapData={mapData}
          mode={mapMode}
          tripFilter={vehicleFilter}
          routeGeometries={routeGeometries}
          isRouteLoading={isRouteLoading}
          legendVisible={legendVisible}
          setLegendVisible={setLegendVisible}
          visibleTrips={visibleTrips}
        />
        <div className="map-control-select map-control-select-mobile">
          <select
            value={vehicleFilter}
            onChange={(event) => setVehicleFilter(event.target.value)}
            disabled={!selectedResult}>
            <option value="ALL">Combined View</option>
            {mapData.vehicles.map((vehicleId) => (
              <option key={vehicleId} value={vehicleId}>
                {vehicleId}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="dashboard-actions">
        <button type="button" className="gold-button" onClick={onNewCase}>
          + NEW TEST CASE
        </button>
      </div>

      {hasCases && (
        <h2 className="dashboard-section-title">TEST CASE PARAMETERS:</h2>
      )}

      <div className="stats-grid">
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
        {hasCases && (
          <>
            <StatCard
              label="BASELINE COST"
              value={formatCurrency(metrics.baseline_cost)}
            />
            <StatCard
              label="NET SAVINGS"
              value={formatCurrency(metrics.net_savings)}
            />
            <StatCard
              label="SAVINGS %"
              value={`${formatNumber(metrics.savings_percentage)}%`}
            />
            <StatCard
              label="OPTIMIZED TIME"
              value={formatMinutes(metrics.optimized_travel_time_min)}
            />
            <StatCard
              label="BASELINE TIME"
              value={formatMinutes(metrics.baseline_travel_time_min)}
            />
          </>
        )}
      </div>
    </section>
  );
}
