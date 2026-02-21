const TRIP_COLORS = [
  '#f2c400',
  '#e46f39',
  '#4da3ff',
  '#7ac943',
  '#c77dff',
  '#ff7f7f',
  '#4dd8c0',
  '#ffa94d',
];

function asNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function normalizeOptimizationPayload(apiPayload) {
  return {
    id: apiPayload?.id,
    filename: apiPayload?.filename,
    createdAt: apiPayload?.created_at,
    computedMetrics: apiPayload?.computed_metrics || null,
    result: apiPayload?.result || null,
    resultNoConstraints: apiPayload?.result_noconstraints || null,
    resultInfeasible: apiPayload?.result_infeasible || null,
  };
}

export function toResultsListRows(payload) {
  return (payload?.results || []).map((row) => ({
    id: row.id,
    filename: row.filename,
    createdAt: row.created_at,
    computedMetrics: row.computed_metrics || {},
  }));
}

function hhmmToMinutes(value) {
  if (typeof value !== 'string' || !value.includes(':')) {
    return null;
  }

  const [h, m] = value.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return null;
  }

  return h * 60 + m;
}

function tripDuration(start, end) {
  const s = hhmmToMinutes(start);
  const e = hhmmToMinutes(end);
  if (s === null || e === null) {
    return 0;
  }
  return e >= s ? e - s : 24 * 60 - s + e;
}

function fallbackMetrics(result) {
  if (!result) {
    return {
      vehicles_used: 0,
      employees_covered: 0,
      employees_unrouted: 0,
      total_distance_km: 0,
      total_cost: 0,
      baseline_cost: 0,
      net_savings: 0,
      savings_percentage: 0,
      optimized_travel_time_min: 0,
      baseline_travel_time_min: 0,
    };
  }

  const vehicles = result?.vehicles || [];
  const summary = result?.summary || {};
  const baselineRows = result?.input?.baseline || [];

  const totalDistance = vehicles.reduce(
    (acc, vehicle) =>
      acc +
      (vehicle.trips || []).reduce((tripAcc, trip) => tripAcc + asNumber(trip.trip_distance_km), 0),
    0
  );

  const optimizedTravelTime = vehicles.reduce(
    (acc, vehicle) =>
      acc +
      (vehicle.trips || []).reduce((tripAcc, trip) => tripAcc + tripDuration(trip.start_time, trip.end_time), 0),
    0
  );

  const baselineTravelTime = baselineRows.reduce((acc, row) => acc + asNumber(row.baseline_time_min), 0);

  return {
    vehicles_used: vehicles.length,
    employees_covered: asNumber(summary.employees_routed),
    employees_unrouted: asNumber(summary.employees_unrouted),
    total_distance_km: totalDistance,
    total_cost: asNumber(summary.total_optimized_cost),
    baseline_cost: asNumber(summary.total_baseline_cost),
    net_savings: asNumber(summary.net_savings),
    savings_percentage: asNumber(summary.savings_percentage),
    optimized_travel_time_min: optimizedTravelTime,
    baseline_travel_time_min: baselineTravelTime,
  };
}

export function getMetrics(resultPayload, mode = 'optimized') {
  if (!resultPayload) {
    return {
      vehicles_used: 0,
      employees_covered: 0,
      employees_unrouted: 0,
      total_distance_km: 0,
      total_cost: 0,
      baseline_cost: 0,
      net_savings: 0,
      savings_percentage: 0,
      optimized_travel_time_min: 0,
      baseline_travel_time_min: 0,
    };
  }

  // Select the appropriate result based on mode
  let result;
  if (mode === 'noconstraints' && resultPayload?.resultNoConstraints) {
    result = resultPayload.resultNoConstraints;
  } else if (mode === 'infeasible' && resultPayload?.resultInfeasible) {
    result = resultPayload.resultInfeasible;
  } else {
    result = resultPayload?.result;
  }

  if (resultPayload.computedMetrics && mode === 'optimized') {
    return resultPayload.computedMetrics;
  }

  return fallbackMetrics(result);
}

function officeFromEmployees(employeeMap) {
  const first = Object.values(employeeMap || {})[0];
  if (!first || !first.drop) {
    return null;
  }
  return [asNumber(first.drop.lat), asNumber(first.drop.lng)];
}

export function buildMapData(resultPayload, mode = 'optimized') {
  // Select the appropriate result based on mode
  let result;
  if (mode === 'noconstraints' && resultPayload?.resultNoConstraints) {
    result = resultPayload.resultNoConstraints;
  } else if (mode === 'infeasible' && resultPayload?.resultInfeasible) {
    result = resultPayload.resultInfeasible;
  } else {
    result = resultPayload?.result;
  }

  const employees = result?.input?.employees || {};
  const vehiclesMeta = result?.input?.vehicles || [];
  const office = officeFromEmployees(employees);

  const initialMarkers = Object.entries(employees).flatMap(([employeeId, employee]) => {
    const pickup = [asNumber(employee.pickup?.lat), asNumber(employee.pickup?.lng)];
    const drop = [asNumber(employee.drop?.lat), asNumber(employee.drop?.lng)];

    return [
      {
        id: `${employeeId}-pickup`,
        kind: 'pickup',
        employeeId,
        position: pickup,
        label: `EMP ${employeeId} Pickup`,
      },
      {
        id: `${employeeId}-drop`,
        kind: 'drop',
        employeeId,
        position: drop,
        label: `EMP ${employeeId} Drop`,
      },
    ];
  });

  const trips = [];
  let colorIndex = 0;

  (result?.vehicles || []).forEach((vehicle) => {
    const vehicleMeta = vehiclesMeta.find((entry) => entry.vehicle_id === vehicle.vehicle_id);
    const vehicleStart = vehicleMeta ? [asNumber(vehicleMeta.current_lat), asNumber(vehicleMeta.current_lng)] : null;

    (vehicle.trips || []).forEach((trip, index) => {
      const tripNumber = trip.trip_number || index + 1;
      const passengersMap = Object.fromEntries(
        (trip.passengers || []).map((passenger) => [passenger.employee_id, passenger])
      );

      const waypoints = (trip.route || [])
        .map((token) => {
          if (token === 'START') {
            return vehicleStart
              ? {
                  type: 'start',
                  token,
                  position: vehicleStart,
                  tooltip: `${vehicle.vehicle_id} T${tripNumber} START\n${trip.start_time || ''}`,
                }
              : null;
          }

          if (token === 'END') {
            return office
              ? {
                  type: 'end',
                  token,
                  position: office,
                  tooltip: `${vehicle.vehicle_id} T${tripNumber} END\n${trip.end_time || ''}`,
                }
              : null;
          }

          const employee = employees[token];
          if (!employee?.pickup) {
            return null;
          }

          const passenger = passengersMap[token] || {};
          return {
            type: 'pickup',
            token,
            employeeId: token,
            position: [asNumber(employee.pickup.lat), asNumber(employee.pickup.lng)],
            tooltip: `${vehicle.vehicle_id} T${tripNumber}\nEMP ${token}\nPU ${passenger.pickup_time || '-'} | DR ${passenger.drop_time || '-'}`,
          };
        })
        .filter(Boolean);

      const path = waypoints.map((point) => point.position);

      trips.push({
        id: `${vehicle.vehicle_id}-trip-${tripNumber}`,
        vehicleId: vehicle.vehicle_id,
        tripNumber,
        color: TRIP_COLORS[colorIndex % TRIP_COLORS.length],
        startTime: trip.start_time || '',
        endTime: trip.end_time || '',
        routeTokens: trip.route || [],
        load: trip.load,
        capacity: trip.capacity_limit,
        distanceKm: asNumber(trip.trip_distance_km),
        waypoints,
        path,
      });

      colorIndex += 1;
    });
  });

  const points = [...initialMarkers.map((entry) => entry.position), ...trips.flatMap((trip) => trip.path)];

  const center = points.length
    ? [
        points.reduce((acc, [lat]) => acc + lat, 0) / points.length,
        points.reduce((acc, [, lng]) => acc + lng, 0) / points.length,
      ]
    : [12.9716, 77.5946];

  const vehicles = [...new Set(trips.map((trip) => trip.vehicleId))];

  return {
    center,
    initialMarkers,
    trips,
    vehicles,
  };
}

export function formatCurrency(value) {
  return `Rs ${asNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatNumber(value) {
  return asNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatMinutes(minutes) {
  const total = Math.max(0, Math.round(asNumber(minutes)));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
