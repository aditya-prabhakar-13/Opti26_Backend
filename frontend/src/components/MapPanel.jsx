import { useRef, useEffect, useMemo } from "react";
import { darkenHex } from "../lib/util";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
} from "react-leaflet";

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
}) {
  const legendRef = useRef(null);

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

  return (
    <div className="map-stage">
      <MapContainer
        center={mapData.center}
        zoom={12}
        className="map-canvas"
        scrollWheelZoom
        attributionControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mode === "initial" &&
          mapData.initialMarkers.map((marker) => (
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

        {mode === "optimized" &&
          visibleTrips.map((trip) => {
            const routedCoordinates = routeGeometries[trip.id] || trip.path;

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

        {mode === "optimized" &&
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
      {mode === "optimized" && isRouteLoading && (
        <div className="map-loading-overlay">
          <div className="map-loading-card">
            <span className="map-loading-spinner" />
            <strong>Rendering real road routes...</strong>
            {totalRoutesCount > 0 && (
              <>
                <div className="map-loading-progress-bar">
                  <div 
                    className="map-loading-progress-fill"
                    style={{ width: `${(routesLoadedCount / totalRoutesCount) * 100}%` }}
                  >
                    <div className="map-loading-progress-shimmer"></div>
                  </div>
                </div>
                <small className="map-loading-count">{routesLoadedCount} of {totalRoutesCount} routes loaded</small>
              </>
            )}
            {totalRoutesCount === 0 && (
              <small>Please wait a few seconds</small>
            )}
          </div>
        </div>
      )}

      {mode === "optimized" && visibleTrips.length > 0 && (
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
