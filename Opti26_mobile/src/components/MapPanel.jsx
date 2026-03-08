import { useRef, useEffect, useMemo } from "react";
import { darkenHex } from "../lib/util";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";

function BoundsFitter({
  mode,
  filteredInitialMarkers,
  visibleTrips,
  routeGeometries,
  fitBoundsToggle,
}) {
  const map = useMap();

  useEffect(() => {
    let bounds = L.latLngBounds([]);
    let hasPoints = false;

    if (mode === "initial") {
      filteredInitialMarkers.forEach((marker) => {
        if (marker.position && marker.position.length === 2) {
          bounds.extend(marker.position);
          hasPoints = true;
        }
      });
    } else {
      visibleTrips.forEach((trip) => {
        const coords = routeGeometries?.[trip.id] || trip.path;
        if (coords && coords.length > 0) {
          coords.forEach((coord) => {
            if (coord && coord.length === 2) {
              bounds.extend(coord);
              hasPoints = true;
            }
          });
        }
      });
    }

    if (hasPoints && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [map, mode, filteredInitialMarkers, visibleTrips, routeGeometries, fitBoundsToggle]);

  return null;
}

export default function MapPanel({
  mapData,
  mode,
  tripFilter,
  routeGeometries,
  isRouteLoading,
  routesLoadedCount,
  totalRoutesCount,
  legendVisible,
  setLegendVisible,
  visibleTrips,
  fitBoundsToggle,
}) {
  const legendRef = useRef(null);
  const normalizeVehicleId = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  useEffect(() => {
    function handleClickOutside(event) {
      if (legendRef.current && !legendRef.current.contains(event.target)) {
        setLegendVisible(false);
      }
    }

    if (legendVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [legendVisible, setLegendVisible]);

  // Check if we're in any optimized mode (not initial)
  const isOptimizedMode = mode !== "initial";
  const modeGeometries = routeGeometries?.[mode] || {};

  const employeeTripColors = useMemo(() => {
    const colorByEmployee = {};
    mapData.trips.forEach((trip) => {
      trip.waypoints.forEach((waypoint) => {
        if (waypoint.employeeId && !colorByEmployee[waypoint.employeeId]) {
          colorByEmployee[waypoint.employeeId] = darkenHex(trip.color, 0.72);
        }
      });
    });
    return colorByEmployee;
  }, [mapData.trips]);

  // Filter initial markers based on selected vehicle
  const filteredInitialMarkers = useMemo(() => {
    if (mode !== "initial" || tripFilter === "ALL") {
      return mapData.initialMarkers;
    }

    // If a specific vehicle is selected, show only employees in that vehicle's routes
    const employeesInRoutes = new Set();
    const normalizedFilter = normalizeVehicleId(tripFilter);
    mapData.trips.forEach((trip) => {
      if (normalizeVehicleId(trip.vehicleId) === normalizedFilter) {
        trip.waypoints.forEach((waypoint) => {
          if (waypoint.employeeId) {
            employeesInRoutes.add(waypoint.employeeId);
          }
        });
      }
    });

    return mapData.initialMarkers.filter((marker) =>
      employeesInRoutes.has(marker.employeeId),
    );
  }, [mode, tripFilter, mapData.trips, mapData.initialMarkers]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={mapData.center}
        zoom={12}
        className="map-canvas"
        scrollWheelZoom
        attributionControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
        />

        <BoundsFitter
          mode={mode}
          filteredInitialMarkers={filteredInitialMarkers}
          visibleTrips={visibleTrips}
          routeGeometries={modeGeometries}
          fitBoundsToggle={fitBoundsToggle}
        />

        {mode === "initial" &&
          filteredInitialMarkers.map((marker) => (
            <CircleMarker
              key={marker.id}
              center={marker.position}
              radius={marker.kind === "pickup" ? 6 : 5}
              pathOptions={{
                color: marker.kind === "drop" ? "#8f121a" : "#0f1115",
                fillColor:
                  marker.kind === "drop"
                    ? "#de3b3b"
                    : employeeTripColors[marker.employeeId] || "#4f5668",
                fillOpacity: 0.9,
                weight: 2,
              }}>
              <Tooltip direction="top" offset={[0, -6]}>
                {marker.label}
              </Tooltip>
              <Popup>{marker.label}</Popup>
            </CircleMarker>
          ))}

        {isOptimizedMode &&
          visibleTrips.map((trip) => {
            const routedCoordinates = modeGeometries[trip.id] || trip.path;

            return (
              <Polyline
                key={trip.id}
                positions={routedCoordinates}
                pathOptions={{
                  color: darkenHex(trip.color, 0.72),
                  weight: 5,
                  opacity: 0.92,
                  lineJoin: "round",
                  lineCap: "round",
                }}>
                <Popup>
                  <strong>
                    {trip.vehicleId} - Trip {trip.tripNumber}
                  </strong>
                  <div>
                    {trip.startTime} to {trip.endTime}
                  </div>
                  <div>
                    {trip.distanceKm.toFixed(2)} km | load {trip.load}/
                    {trip.capacity}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

        {isOptimizedMode &&
          visibleTrips.flatMap((trip) =>
            trip.waypoints.map((point, index) => (
              <CircleMarker
                key={`${trip.id}-point-${index}`}
                center={point.position}
                radius={
                  point.type === "start" ? 7 : point.type === "end" ? 6 : 5
                }
                pathOptions={{
                  color:
                    point.type === "pickup"
                      ? "#0f1115"
                      : point.type === "end"
                        ? "#8f121a"
                        : "#202020",
                  fillColor:
                    point.type === "pickup"
                      ? darkenHex(trip.color, 0.72)
                      : point.type === "end"
                        ? "#de3b3b"
                        : "#202020",
                  fillOpacity: 0.95,
                  weight:
                    point.type === "pickup" || point.type === "end" ? 2.2 : 1.5,
                }}>
                <Tooltip direction="top" offset={[0, -8]}>
                  {point.tooltip}
                </Tooltip>
                <Popup>{point.tooltip}</Popup>
              </CircleMarker>
            )),
          )}
      </MapContainer>
      {isOptimizedMode && isRouteLoading && (
        <div className="map-loading-overlay">
          <div className="map-loading-card">
            <span className="map-loading-spinner" />
            <strong>Rendering real road routes...</strong>
            {totalRoutesCount > 0 && (
              <>
                <div className="map-loading-progress-bar">
                  <div
                    className="map-loading-progress-fill"
                    style={{
                      width: `${(routesLoadedCount / totalRoutesCount) * 100}%`,
                    }}>
                    <div className="map-loading-progress-shimmer"></div>
                  </div>
                </div>
                <small className="map-loading-count">
                  {routesLoadedCount} of {totalRoutesCount} routes loaded
                </small>
              </>
            )}
            {totalRoutesCount === 0 && <small>Please wait a few seconds</small>}
          </div>
        </div>
      )}

      {isOptimizedMode && visibleTrips.length > 0 && (
        <div className="legend-container" ref={legendRef}>
          <button
            type="button"
            className={
              legendVisible ? "legend-toggle is-active" : "legend-toggle"
            }
            onClick={() => setLegendVisible(!legendVisible)}
            title={legendVisible ? "Hide Legends" : "Show Legends"}>
            ≡ LEGENDS
          </button>

          {legendVisible && (
            <div className="trip-legend">
              {visibleTrips.map((trip) => (
                <div key={trip.id} className="trip-legend-item">
                  <span
                    className="trip-color"
                    style={{ background: darkenHex(trip.color, 0.72) }}
                  />
                  <strong>{trip.vehicleId}</strong>
                  <span className="trip-chip">
                    {trip.distanceKm.toFixed(1)}km
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
