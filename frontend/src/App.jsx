import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip } from 'react-leaflet';
import { deleteResult, fetchLatestResult, fetchResultDetail, fetchResults, fetchRoadGeometry, optimizeExcel } from './api';
import {
  buildMapData,
  formatCurrency,
  formatMinutes,
  formatNumber,
  getMetrics,
  normalizeOptimizationPayload,
  toResultsListRows,
} from './lib/transform';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'DASHBOARD' },
  { id: 'testcases', label: 'TEST CASES' },
  { id: 'new', label: 'NEW TEST CASES' },
];

function darkenHex(hex, factor = 0.72) {
  if (typeof hex !== 'string' || !hex.startsWith('#') || hex.length !== 7) {
    return '#2f6bb0';
  }

  const r = Math.max(0, Math.floor(parseInt(hex.slice(1, 3), 16) * factor));
  const g = Math.max(0, Math.floor(parseInt(hex.slice(3, 5), 16) * factor));
  const b = Math.max(0, Math.floor(parseInt(hex.slice(5, 7), 16) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function LogoMark() {
  return (
    <div className="logo-mark" aria-hidden>
      <span className="logo-ring" />
      <span className="logo-dot" />
      <span className="logo-pin" />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MapPanel({ mapData, mode, tripFilter, routeGeometries, isRouteLoading, legendVisible, setLegendVisible, visibleTrips }) {
  const legendRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (legendRef.current && !legendRef.current.contains(event.target)) {
        setLegendVisible(false);
      }
    }

    if (legendVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
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
      <MapContainer center={mapData.center} zoom={12} className="map-canvas" scrollWheelZoom attributionControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mode === 'initial' &&
          mapData.initialMarkers.map((marker) => (
            <CircleMarker
              key={marker.id}
              center={marker.position}
              radius={marker.kind === 'pickup' ? 6 : 5}
              pathOptions={{
                color: marker.kind === 'drop' ? '#8f121a' : '#0f1115',
                fillColor: marker.kind === 'drop' ? '#de3b3b' : employeeTripColors[marker.employeeId] || '#4f5668',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>{marker.label}</Tooltip>
              <Popup>{marker.label}</Popup>
            </CircleMarker>
          ))}

        {mode === 'optimized' &&
          visibleTrips.map((trip) => {
            const routedCoordinates = routeGeometries[trip.id] || trip.path;

            return (
              <Polyline
                key={trip.id}
                positions={routedCoordinates}
                pathOptions={{ color: darkenHex(trip.color, 0.72), weight: 5, opacity: 0.92, lineJoin: 'round', lineCap: 'round' }}
              >
                <Popup>
                  <strong>
                    {trip.vehicleId} - Trip {trip.tripNumber}
                  </strong>
                  <div>
                    {trip.startTime} to {trip.endTime}
                  </div>
                  <div>
                    {trip.distanceKm.toFixed(2)} km | load {trip.load}/{trip.capacity}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

        {mode === 'optimized' &&
          visibleTrips.flatMap((trip) =>
            trip.waypoints.map((point, index) => (
              <CircleMarker
                key={`${trip.id}-point-${index}`}
                center={point.position}
                radius={point.type === 'start' ? 7 : point.type === 'end' ? 6 : 5}
                pathOptions={{
                  color: point.type === 'pickup' ? '#0f1115' : point.type === 'end' ? '#8f121a' : '#202020',
                  fillColor: point.type === 'pickup' ? darkenHex(trip.color, 0.72) : point.type === 'end' ? '#de3b3b' : '#202020',
                  fillOpacity: 0.95,
                  weight: point.type === 'pickup' || point.type === 'end' ? 2.2 : 1.5,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]}>{point.tooltip}</Tooltip>
                <Popup>{point.tooltip}</Popup>
              </CircleMarker>
            ))
          )}
      </MapContainer>
      {mode === 'optimized' && isRouteLoading && (
        <div className="map-loading-overlay">
          <div className="map-loading-card">
            <span className="map-loading-spinner" />
            <strong>Rendering real road routes...</strong>
            <small>Please wait a few seconds</small>
          </div>
        </div>
      )}

      {mode === 'optimized' && visibleTrips.length > 0 && (
        <div className="legend-container" ref={legendRef}>
          <button
            type="button"
            className={legendVisible ? 'legend-toggle is-active' : 'legend-toggle'}
            onClick={() => setLegendVisible(!legendVisible)}
            title={legendVisible ? 'Hide Legends' : 'Show Legends'}
          >
            ≡ LEGENDS
          </button>

          {legendVisible && (
            <div className="trip-legend">
              {visibleTrips.map((trip) => (
                <div key={trip.id} className="trip-legend-item">
                  <span className="trip-color" style={{ background: darkenHex(trip.color, 0.72) }} />
                  <strong>{trip.vehicleId}</strong>
                  <span className="trip-chip">{trip.distanceKm.toFixed(1)}km</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState('new');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760);
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [mapMode, setMapMode] = useState('optimized');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [routeGeometries, setRouteGeometries] = useState({});
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [legendVisible, setLegendVisible] = useState(false);

  const hasCases = results.length > 0;
  const effectiveNav = hasCases ? activeNav : 'new';

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const [rowsPayload, latestPayload] = await Promise.all([fetchResults(), fetchLatestResult()]);
        if (!mounted) {
          return;
        }

        const rows = toResultsListRows(rowsPayload);
        setResults(rows);

        if (rows.length === 0) {
          setActiveNav('new');
          return;
        }

        setActiveNav('dashboard');

        if (latestPayload?.result) {
          setSelectedResult(normalizeOptimizationPayload(latestPayload));
        } else {
          const detail = await fetchResultDetail(rows[0].id);
          if (mounted) {
            setSelectedResult(normalizeOptimizationPayload(detail));
          }
        }
      } catch (initErr) {
        if (mounted) {
          setError(initErr.message || 'Unable to load existing results');
          setResults([]);
          setActiveNav('new');
        }
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasCases) {
      setSidebarOpen(false);
    }
  }, [hasCases]);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 760);
    }

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflowY = hasCases ? 'auto' : 'hidden';
    return () => {
      document.body.style.overflowY = 'auto';
    };
  }, [hasCases]);

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
        })
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
      setActiveNav('new');
      return;
    }

    if (selectId) {
      const detail = await fetchResultDetail(selectId);
      setSelectedResult(normalizeOptimizationPayload(detail));
      return;
    }

    const detail = await fetchResultDetail(rows[0].id);
    setSelectedResult(normalizeOptimizationPayload(detail));
  }

  async function runOptimization() {
    if (!selectedFile) {
      setError('Please select an .xlsx file first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const created = await optimizeExcel(selectedFile);
      const normalized = normalizeOptimizationPayload(created);
      setSelectedResult(normalized);
      setVehicleFilter('ALL');
      await refreshResults(normalized.id);
      setActiveNav('dashboard');
    } catch (runErr) {
      setError(runErr.message || 'Optimization failed');
    } finally {
      setLoading(false);
    }
  }

  async function openResult(resultId) {
    try {
      const detail = await fetchResultDetail(resultId);
      setSelectedResult(normalizeOptimizationPayload(detail));
      setActiveNav('dashboard');
      setSidebarOpen(false);
      setVehicleFilter('ALL');
    } catch (detailErr) {
      setError(detailErr.message || 'Unable to load result');
    }
  }

  async function removeResult(resultId) {
    const shouldDelete = window.confirm('Delete this test case permanently?');
    if (!shouldDelete) {
      return;
    }

    setDeletingId(resultId);
    setError('');

    try {
      await deleteResult(resultId);
      const isCurrent = selectedResult?.id === resultId;
      if (isCurrent) {
        setSelectedResult(null);
      }
      await refreshResults();
      if (isCurrent) {
        setActiveNav('dashboard');
      }
    } catch (deleteErr) {
      setError(deleteErr.message || 'Unable to delete result');
    } finally {
      setDeletingId(null);
    }
  }

  const metrics = useMemo(() => getMetrics(selectedResult), [selectedResult]);
  const mapData = useMemo(() => buildMapData(selectedResult), [selectedResult]);
  const visibleTrips = useMemo(() => {
    if (vehicleFilter === 'ALL') {
      return mapData.trips;
    }
    return mapData.trips.filter((trip) => trip.vehicleId === vehicleFilter);
  }, [mapData.trips, vehicleFilter]);

  const dashboardView = (
    <section className="page dashboard-page">
      <div className="toolbar-row">
        <h1>MAPS:</h1>
      </div>

      <div className="map-card">
        <div className="map-controls">
          <div className="map-control-buttons">
            <button type="button" className={mapMode === 'initial' ? 'is-active' : ''} onClick={() => setMapMode('initial')}>
              Initial Points
            </button>
            <button
              type="button"
              className={mapMode === 'optimized' ? 'is-active' : ''}
              onClick={() => setMapMode('optimized')}
              disabled={!selectedResult}
            >
              Optimized Routes
            </button>
          </div>
          <div className="map-control-select map-control-select-desktop">
            <select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} disabled={!selectedResult}>
              <option value="ALL">Combined View</option>
              {mapData.vehicles.map((vehicleId) => (
                <option key={vehicleId} value={vehicleId}>
                  {vehicleId}
                </option>
              ))}
            </select>
          </div>
        </div>
        <MapPanel mapData={mapData} mode={mapMode} tripFilter={vehicleFilter} routeGeometries={routeGeometries} isRouteLoading={isRouteLoading} legendVisible={legendVisible} setLegendVisible={setLegendVisible} visibleTrips={visibleTrips} />
        <div className="map-control-select map-control-select-mobile">
          <select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} disabled={!selectedResult}>
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
        <button type="button" className="gold-button" onClick={() => setActiveNav('new')}>
          + NEW TEST CASE
        </button>
      </div>

      <div className="stats-grid">
        <StatCard label="VEHICLES USED" value={formatNumber(metrics.vehicles_used)} />
        <StatCard label="EMPLOYEES COVERED" value={formatNumber(metrics.employees_covered)} />
        <StatCard label="TOTAL DISTANCE" value={`${formatNumber(metrics.total_distance_km)} km`} />
        <StatCard label="TOTAL COST" value={formatCurrency(metrics.total_cost)} />
      </div>
    </section>
  );

  const testCasesView = (
    <section className="page testcase-page">
      <h1>TEST CASES</h1>
      <div className="testcase-layout">
        <aside className="testcase-list">
          <h2>AVAILABLE RUNS</h2>
          {results.length === 0 && <p className="muted">No cases found yet.</p>}
          {results.map((row) => (
            <div key={row.id} className={selectedResult?.id === row.id ? 'case-row-shell is-selected' : 'case-row-shell'}>
              <button type="button" className="case-row-main" onClick={() => openResult(row.id)}>
                <span>{row.filename}</span>
                <small>{new Date(row.createdAt).toLocaleString()}</small>
              </button>
              <button
                type="button"
                className="case-delete"
                onClick={() => removeResult(row.id)}
                disabled={deletingId === row.id}
                aria-label={`Delete ${row.filename}`}
                title="Delete test case"
              >
                {deletingId === row.id ? '...' : 'Delete'}
              </button>
            </div>
          ))}
        </aside>

        <div className="testcase-detail">
          <div className="testcase-map-box">
            <MapPanel mapData={mapData} mode="optimized" tripFilter={vehicleFilter} routeGeometries={routeGeometries} legendVisible={legendVisible} setLegendVisible={setLegendVisible} visibleTrips={visibleTrips} />
          </div>
          <div className="stats-grid compact">
            <StatCard label="VEHICLES USED" value={formatNumber(metrics.vehicles_used)} />
            <StatCard label="EMPLOYEES COVERED" value={formatNumber(metrics.employees_covered)} />
            <StatCard label="TOTAL DISTANCE" value={`${formatNumber(metrics.total_distance_km)} km`} />
            <StatCard label="TOTAL COST" value={formatCurrency(metrics.total_cost)} />
          </div>
        </div>
      </div>
    </section>
  );

  const newCaseView = (
    <section className={hasCases ? 'page newcase-page' : 'page newcase-page onboarding'}>
      {!hasCases && (
        <div className="onboarding-badge" aria-hidden>
          <div className="paper-map" />
          <span className="pin red p1" />
          <span className="pin red p2" />
          <span className="pin red p3" />
          <span className="pin green p4" />
        </div>
      )}

      <div className="newcase-copy">
        <h1>NEW TEST CASE:</h1>
        <p>
          Streamline your commute planning by creating a new optimization scenario. Upload your latest Excel data and
          generate explainable routes.
        </p>

        <h2>UPLOAD EXCEL DATA:</h2>
        <div className="upload-card">
          <label className="upload-zone" htmlFor="upload-input">
            <input
              id="upload-input"
              type="file"
              accept=".xlsx"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
            <span className="upload-icon">?</span>
            <span className="upload-label">{selectedFile ? selectedFile.name : 'Tap to choose a file'}</span>
          </label>
          <div className="fake-progress" />
          <p>SUPPORTED FORMATS: .XLSX</p>
          <button type="button" className="gold-button" disabled={loading} onClick={runOptimization}>
            {loading ? 'RUNNING...' : 'RUN OPTIMIZATION'}
          </button>
        </div>

        {hasCases && (
          <>
            <h2>TEST CASE PARAMETERS:</h2>
            <div className="params-grid">
              <StatCard label="BASELINE COST" value={formatCurrency(metrics.baseline_cost)} />
              <StatCard label="NET SAVINGS" value={formatCurrency(metrics.net_savings)} />
              <StatCard label="SAVINGS %" value={`${formatNumber(metrics.savings_percentage)}%`} />
              <StatCard label="OPTIMIZED TIME" value={formatMinutes(metrics.optimized_travel_time_min)} />
              <StatCard label="BASELINE TIME" value={formatMinutes(metrics.baseline_travel_time_min)} />
            </div>
          </>
        )}
      </div>

      {hasCases && (
        <div className="newcase-art" aria-hidden>
          <div className="paper-map" />
          <span className="pin red p1" />
          <span className="pin red p2" />
          <span className="pin red p3" />
          <span className="pin green p4" />
        </div>
      )}
    </section>
  );

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
              <button type="button" className={sidebarOpen ? 'hamburger is-open' : 'hamburger'} onClick={() => setSidebarOpen((open) => !open)}>
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
                  className={effectiveNav === item.id ? 'nav-link is-active' : 'nav-link'}
                  onClick={() => {
                    setActiveNav(item.id);
                  }}
                >
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
                    className={effectiveNav === item.id ? 'nav-link is-active' : 'nav-link'}
                    onClick={() => {
                      setActiveNav(item.id);
                      setSidebarOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <button type="button" className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
            </>
          )}
        </>
      )}

      <main className={hasCases ? 'content-shell with-nav' : 'content-shell no-nav'}>
        {error && <div className="error-banner">{error}</div>}
        {effectiveNav === 'dashboard' && dashboardView}
        {effectiveNav === 'testcases' && testCasesView}
        {effectiveNav === 'new' && newCaseView}
      </main>
    </div>
  );
}
