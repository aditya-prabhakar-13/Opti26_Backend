import { useState, useMemo, useEffect } from "react";

/* ── Fonts (injected once) ── */
if (typeof document !== "undefined" && !document.getElementById("db-fonts")) {
  const link = document.createElement("link");
  link.id = "db-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,700&display=swap";
  document.head.appendChild(link);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_PALETTE = [
  {
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    text: "#fbbf24",
    soft: "rgba(245,158,11,0.08)",
  },
  {
    accent: "#38bdf8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.3)",
    text: "#7dd3fc",
    soft: "rgba(56,189,248,0.08)",
  },
  {
    accent: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.3)",
    text: "#c4b5fd",
    soft: "rgba(167,139,250,0.08)",
  },
  {
    accent: "#34d399",
    bg: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.3)",
    text: "#6ee7b7",
    soft: "rgba(52,211,153,0.08)",
  },
  {
    accent: "#fb7185",
    bg: "rgba(251,113,133,0.12)",
    border: "rgba(251,113,133,0.3)",
    text: "#fda4af",
    soft: "rgba(251,113,133,0.08)",
  },
];

const PRIORITY_LABEL = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Minimal",
};
const PRIORITY_COLOR = {
  1: { bg: "rgba(251,113,133,0.15)", text: "#fda4af", dot: "#fb7185" },
  2: { bg: "rgba(251,191,36,0.15)", text: "#fde68a", dot: "#fbbf24" },
  3: { bg: "rgba(56,189,248,0.15)", text: "#7dd3fc", dot: "#38bdf8" },
  4: { bg: "rgba(52,211,153,0.15)", text: "#6ee7b7", dot: "#34d399" },
  5: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", dot: "#64748b" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCost(n) {
  if (n == null) return "—";
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDist(n) {
  if (n == null) return "—";
  return `${Number(n).toFixed(2)} km`;
}
function fmtTime(t) {
  return t ?? "—";
}

function timeDiffMin(t1, t2) {
  if (!t1 || !t2) return null;
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

function durationLabel(mins) {
  if (mins == null || mins < 0) return "—";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Chip({ children, style, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap"
      style={{
        border: `1px solid ${active ? style.border : "rgba(148,163,184,0.15)"}`,
        background: active ? style.bg : "rgba(15,23,42,0.4)",
        color: active ? style.text : "rgba(148,163,184,0.6)",
        boxShadow: active ? `0 0 12px 0 ${style.accent}22` : "none",
      }}>
      {active && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: style.dot ?? style.accent }}
        />
      )}
      {children}
    </button>
  );
}

function Badge({ children, color = "#94a3b8" }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}30`,
      }}>
      {children}
    </span>
  );
}

function RouteStops({ route, palette }) {
  const stops = route.filter((s) => s !== "START" && s !== "END");
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.35)" }}>
        START
      </span>
      {stops.map((stop, i) => (
        <span key={i} className="flex items-center gap-1">
          <span
            className="text-[10px]"
            style={{ color: "rgba(148,163,184,0.25)" }}>
            →
          </span>
          <span
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold"
            style={{
              background: palette.soft,
              color: palette.text,
              border: `1px solid ${palette.border}`,
            }}>
            {stop}
          </span>
        </span>
      ))}
      <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.25)" }}>
        →
      </span>
      <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.35)" }}>
        END
      </span>
    </div>
  );
}

// ─── Vehicle View ─────────────────────────────────────────────────────────────

function VehicleView({ vehicles, inputVehicles, selectedVehicleId }) {
  const filtered =
    selectedVehicleId === "ALL"
      ? vehicles
      : vehicles.filter((v) => v.vehicle_id === selectedVehicleId);

  if (filtered.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-16 rounded-2xl"
        style={{
          border: "1px solid rgba(148,163,184,0.1)",
          background: "rgba(15,23,42,0.4)",
        }}>
        <p
          className="text-sm font-semibold"
          style={{ color: "rgba(148,163,184,0.35)" }}>
          No vehicles found for current selection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filtered.map((vehicle) => {
        const palette =
          VEHICLE_PALETTE[
            vehicles.findIndex((v) => v.vehicle_id === vehicle.vehicle_id) %
              VEHICLE_PALETTE.length
          ];
        const inputV = inputVehicles?.find(
          (v) => v.vehicle_id === vehicle.vehicle_id,
        );

        return (
          <div
            key={vehicle.vehicle_id}
            className="rounded-2xl overflow-hidden"
            style={{
              border: `1px solid ${palette.border}`,
              background: "rgba(15,23,42,0.5)",
            }}>
            {/* Vehicle header */}
            <div
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{
                background: palette.bg,
                borderBottom: `1px solid ${palette.border}`,
              }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: palette.accent, color: "#0f172a" }}>
                  {vehicle.vehicle_id}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-base">
                      {vehicle.vehicle_id}
                    </span>
                    <Badge
                      color={
                        vehicle.category === "premium" ? "#f59e0b" : "#94a3b8"
                      }>
                      {vehicle.category}
                    </Badge>
                    {inputV && (
                      <Badge color="#38bdf8">{inputV.vehicle_type}</Badge>
                    )}
                    {inputV && (
                      <Badge
                        color={
                          inputV.fuel_type === "electric"
                            ? "#34d399"
                            : "#94a3b8"
                        }>
                        {inputV.fuel_type}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    {inputV && (
                      <>
                        <span
                          className="text-xs"
                          style={{ color: "rgba(148,163,184,0.6)" }}>
                          Cap:{" "}
                          <span className="text-white font-semibold">
                            {inputV.capacity}
                          </span>
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "rgba(148,163,184,0.6)" }}>
                          Speed:{" "}
                          <span className="text-white font-semibold">
                            {inputV.avg_speed_kmph} km/h
                          </span>
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "rgba(148,163,184,0.6)" }}>
                          Rate:{" "}
                          <span className="text-white font-semibold">
                            ₹{inputV.cost_per_km}/km
                          </span>
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "rgba(148,163,184,0.6)" }}>
                          Available:{" "}
                          <span className="text-white font-semibold">
                            {inputV.available_from}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:text-right">
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: palette.text }}>
                    Total Cost
                  </p>
                  <p className="text-xl font-bold text-white">
                    {fmtCost(vehicle.total_cost)}
                  </p>
                </div>
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "rgba(148,163,184,0.5)" }}>
                    Trips
                  </p>
                  <p className="text-xl font-bold text-white">
                    {vehicle.trips?.length ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Trips */}
            <div
              className="divide-y"
              style={{ borderColor: "rgba(148,163,184,0.07)" }}>
              {vehicle.trips?.map((trip) => {
                const duration = timeDiffMin(trip.start_time, trip.end_time);
                return (
                  <div key={trip.trip_number} className="px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{
                            background: `${palette.accent}30`,
                            color: palette.text,
                            border: `1px solid ${palette.border}`,
                          }}>
                          {trip.trip_number}
                        </div>
                        <span className="text-sm font-bold text-white">
                          Trip {trip.trip_number}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                            style={{
                              background: "rgba(148,163,184,0.08)",
                              color: "rgba(148,163,184,0.7)",
                            }}>
                            {fmtTime(trip.start_time)} →{" "}
                            {fmtTime(trip.end_time)}
                          </span>
                          {duration != null && (
                            <span
                              className="text-xs"
                              style={{ color: "rgba(148,163,184,0.45)" }}>
                              {durationLabel(duration)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs flex-wrap">
                        <span style={{ color: "rgba(148,163,184,0.55)" }}>
                          Distance:{" "}
                          <span className="text-white font-semibold">
                            {fmtDist(trip.trip_distance_km)}
                          </span>
                        </span>
                        <span style={{ color: "rgba(148,163,184,0.55)" }}>
                          Cost:{" "}
                          <span
                            className="font-bold"
                            style={{ color: palette.text }}>
                            {fmtCost(trip.trip_cost)}
                          </span>
                        </span>
                        <span style={{ color: "rgba(148,163,184,0.55)" }}>
                          Load:{" "}
                          <span className="text-white font-semibold">
                            {trip.load}/{trip.capacity_limit}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="mb-4 pl-9">
                      <RouteStops route={trip.route} palette={palette} />
                    </div>

                    {trip.passengers?.length > 0 && (
                      <div className="pl-9 overflow-x-auto">
                        <table className="w-full text-xs min-w-[420px]">
                          <thead>
                            <tr
                              style={{
                                borderBottom: "1px solid rgba(148,163,184,0.1)",
                              }}>
                              {[
                                "Employee",
                                "Pickup Time",
                                "Drop Time",
                                "Ride Duration",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="text-left pb-2 pr-4 font-bold uppercase tracking-wider text-[10px]"
                                  style={{ color: "rgba(148,163,184,0.4)" }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {trip.passengers.map((p, pi) => {
                              const rideDuration = timeDiffMin(
                                p.pickup_time,
                                p.drop_time,
                              );
                              return (
                                <tr
                                  key={p.employee_id}
                                  style={{
                                    borderBottom:
                                      pi < trip.passengers.length - 1
                                        ? "1px solid rgba(148,163,184,0.06)"
                                        : "none",
                                  }}>
                                  <td className="py-2.5 pr-4">
                                    <span
                                      className="inline-flex items-center justify-center w-16 py-1 rounded-lg text-xs font-bold"
                                      style={{
                                        background: palette.soft,
                                        color: palette.text,
                                        border: `1px solid ${palette.border}`,
                                      }}>
                                      {p.employee_id}
                                    </span>
                                  </td>
                                  <td className="py-2.5 pr-4 font-semibold text-white">
                                    {fmtTime(p.pickup_time)}
                                  </td>
                                  <td className="py-2.5 pr-4 font-semibold text-white">
                                    {fmtTime(p.drop_time)}
                                  </td>
                                  <td className="py-2.5">
                                    <span
                                      className="text-xs"
                                      style={{
                                        color: "rgba(148,163,184,0.55)",
                                      }}>
                                      {durationLabel(rideDuration)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Employee View ────────────────────────────────────────────────────────────

function EmployeeView({
  vehicles,
  inputEmployees,
  inputBaseline,
  selectedEmployeeId,
}) {
  const employeeMap = useMemo(() => {
    const map = {};
    vehicles.forEach((vehicle, vIdx) => {
      const palette = VEHICLE_PALETTE[vIdx % VEHICLE_PALETTE.length];
      vehicle.trips?.forEach((trip) => {
        trip.passengers?.forEach((p) => {
          if (!map[p.employee_id]) {
            map[p.employee_id] = { vehicle, palette, trip, passenger: p };
          }
        });
      });
    });
    return map;
  }, [vehicles]);

  const allEmployeeIds = Object.keys(inputEmployees ?? {}).sort();
  const displayed =
    selectedEmployeeId === "ALL" ? allEmployeeIds : [selectedEmployeeId];

  if (displayed.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-16 rounded-2xl"
        style={{
          border: "1px solid rgba(148,163,184,0.1)",
          background: "rgba(15,23,42,0.4)",
        }}>
        <p
          className="text-sm font-semibold"
          style={{ color: "rgba(148,163,184,0.35)" }}>
          No employees found for current selection.
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-2xl"
      style={{ border: "1px solid rgba(148,163,184,0.1)" }}>
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr
            style={{
              background: "rgba(15,23,42,0.8)",
              borderBottom: "1px solid rgba(148,163,184,0.1)",
            }}>
            {[
              "Employee",
              "Priority",
              "Vehicle",
              "Pickup Time",
              "Drop Time",
              "Ride Duration",
              "Earliest Pickup",
              "Latest Drop",
              "Baseline Cost",
              "Preferences",
            ].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ color: "rgba(148,163,184,0.4)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map((empId, rowIdx) => {
            const assignment = employeeMap[empId];
            const empInput = inputEmployees?.[empId];
            const baseline = inputBaseline?.find(
              (b) => b.employee_id === empId,
            );
            const priority = empInput?.priority;
            const pc = PRIORITY_COLOR[priority] ?? PRIORITY_COLOR[3];
            const palette = assignment?.palette;
            const rideDuration = assignment
              ? timeDiffMin(
                  assignment.passenger.pickup_time,
                  assignment.passenger.drop_time,
                )
              : null;

            return (
              <tr
                key={empId}
                style={{
                  background:
                    rowIdx % 2 === 0
                      ? "rgba(15,23,42,0.4)"
                      : "rgba(15,23,42,0.2)",
                  borderBottom: "1px solid rgba(148,163,184,0.06)",
                }}>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center justify-center w-14 py-1.5 rounded-xl text-xs font-bold"
                    style={
                      palette
                        ? {
                            background: palette.soft,
                            color: palette.text,
                            border: `1px solid ${palette.border}`,
                          }
                        : {
                            background: "rgba(148,163,184,0.1)",
                            color: "#94a3b8",
                          }
                    }>
                    {empId}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: pc.dot }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: pc.text }}>
                      {priority} — {PRIORITY_LABEL[priority] ?? "—"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {assignment ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-1 rounded-lg text-xs font-bold"
                        style={{
                          background: palette.bg,
                          color: palette.text,
                          border: `1px solid ${palette.border}`,
                        }}>
                        {assignment.vehicle.vehicle_id}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "rgba(148,163,184,0.45)" }}>
                        Trip {assignment.trip.trip_number}
                      </span>
                    </div>
                  ) : (
                    <span
                      className="text-xs"
                      style={{ color: "rgba(148,163,184,0.3)" }}>
                      Unrouted
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-white text-xs">
                  {assignment ? fmtTime(assignment.passenger.pickup_time) : "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-white text-xs">
                  {assignment ? fmtTime(assignment.passenger.drop_time) : "—"}
                </td>
                <td
                  className="px-4 py-3 text-xs"
                  style={{ color: "rgba(148,163,184,0.6)" }}>
                  {durationLabel(rideDuration)}
                </td>
                <td
                  className="px-4 py-3 text-xs"
                  style={{ color: "rgba(148,163,184,0.55)" }}>
                  {empInput?.earliest_pickup ?? "—"}
                </td>
                <td
                  className="px-4 py-3 text-xs"
                  style={{ color: "rgba(148,163,184,0.55)" }}>
                  {empInput?.latest_drop ?? "—"}
                </td>
                <td
                  className="px-4 py-3 text-xs"
                  style={{ color: "rgba(148,163,184,0.55)" }}>
                  {baseline ? fmtCost(baseline.baseline_cost) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {empInput?.vehicle_preference && (
                      <Badge color="#a78bfa">
                        {empInput.vehicle_preference}
                      </Badge>
                    )}
                    {empInput?.sharing_preference && (
                      <Badge color="#38bdf8">
                        {empInput.sharing_preference}
                      </Badge>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Summary Bar ─────────────────────────────────────────────────────────────

function SummaryBar({ summary }) {
  const items = [
    {
      label: "Employees Routed",
      value: `${summary.employees_routed} / ${summary.total_employees}`,
      color: "#34d399",
    },
    {
      label: "Optimized Cost",
      value: fmtCost(summary.total_optimized_cost),
      color: "#f59e0b",
    },
    {
      label: "Baseline Cost",
      value: fmtCost(summary.total_baseline_cost),
      color: "rgba(148,163,184,0.6)",
    },
    {
      label: "Net Savings",
      value: fmtCost(summary.net_savings),
      color: "#34d399",
    },
    {
      label: "Savings %",
      value: `${Number(summary.savings_percentage).toFixed(1)}%`,
      color: "#34d399",
    },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map(({ label, value, color }) => (
        <div
          key={label}
          className="rounded-xl px-4 py-3"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(148,163,184,0.1)",
          }}>
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1"
            style={{ color: "rgba(148,163,184,0.4)" }}>
            {label}
          </p>
          <p className="text-base font-bold" style={{ color }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResultsTableView({ selectedResult, mapMode }) {
  const [filterMode, setFilterMode] = useState("vehicle");
  const [selectedVehicle, setSelectedVehicle] = useState("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState("ALL");

  // ── Reset filters whenever the result changes ──
  // This is the core fix: stale vehicle/employee IDs from a previous result
  // won't bleed into the next one.
  const resultId = selectedResult?.id;
  useEffect(() => {
    setFilterMode("vehicle");
    setSelectedVehicle("ALL");
    setSelectedEmployee("ALL");
  }, [resultId]);

  // choose between selectedResult.result, selectedResult.infeasible, and selectedResult.resultNoConstraints depending on mapMode
  const result =
    selectedResult?.[
      mapMode == "optimized"
        ? "result"
        : mapMode == "infeasible"
          ? "resultInfeasible"
          : "resultNoConstraints"
    ];

  if (!result) {
    return (
      <div
        className="flex items-center justify-center py-24"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <p
          className="text-sm font-semibold"
          style={{ color: "rgba(148,163,184,0.4)" }}>
          No result data available.
        </p>
      </div>
    );
  }

  const { vehicles, summary, input } = result;
  const inputVehicles = input?.vehicles ?? [];
  const inputEmployees = input?.employees ?? {};
  const inputBaseline = input?.baseline ?? [];
  const allEmployeeIds = Object.keys(inputEmployees).sort();

  // Build vehicleId → palette map from the current result's vehicles
  const vehiclePaletteMap = {};
  vehicles.forEach((v, i) => {
    vehiclePaletteMap[v.vehicle_id] =
      VEHICLE_PALETTE[i % VEHICLE_PALETTE.length];
  });

  // If the stored selectedVehicle no longer exists in this result, treat as ALL
  const activeVehicle = vehicles.some((v) => v.vehicle_id === selectedVehicle)
    ? selectedVehicle
    : "ALL";
  const activeEmployee = allEmployeeIds.includes(selectedEmployee)
    ? selectedEmployee
    : "ALL";

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "#f59e0b" }}>
            Optimization Results
          </p>
          <h2
            className="text-2xl font-bold text-white mt-0.5"
            style={{ fontFamily: "'Fraunces', serif" }}>
            Route Breakdown
          </h2>
        </div>
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold self-start"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "#fbbf24",
          }}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Constrained Optimization
        </div>
      </div>

      {/* ── Summary ── */}
      <SummaryBar summary={summary} />

      {/* ── Filter bar ── */}
      <div
        className="rounded-2xl px-5 py-4 space-y-4"
        style={{
          background: "rgba(15,23,42,0.6)",
          border: "1px solid rgba(148,163,184,0.1)",
        }}>
        {/* Mode toggle */}
        <div
          className="flex items-center p-1 rounded-xl gap-1 w-fit"
          style={{
            background: "rgba(15,23,42,0.7)",
            border: "1px solid rgba(148,163,184,0.1)",
          }}>
          {[
            { key: "vehicle", label: "By Vehicle" },
            { key: "employee", label: "By Employee" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterMode(key)}
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
              style={
                filterMode === key
                  ? {
                      background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                      color: "#0f172a",
                      boxShadow: "0 0 16px rgba(245,158,11,0.3)",
                    }
                  : { color: "rgba(148,163,184,0.5)" }
              }>
              {label}
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-bold uppercase tracking-widest mr-1"
            style={{ color: "rgba(148,163,184,0.35)" }}>
            Filter:
          </span>

          {filterMode === "vehicle" && (
            <>
              <Chip
                style={{
                  bg: "rgba(148,163,184,0.1)",
                  border: "rgba(148,163,184,0.25)",
                  text: "#94a3b8",
                  accent: "#94a3b8",
                }}
                active={activeVehicle === "ALL"}
                onClick={() => setSelectedVehicle("ALL")}>
                All Vehicles
              </Chip>
              {vehicles.map((v) => {
                const p = vehiclePaletteMap[v.vehicle_id];
                return (
                  <Chip
                    key={v.vehicle_id}
                    style={{
                      bg: p.bg,
                      border: p.border,
                      text: p.text,
                      accent: p.accent,
                    }}
                    active={activeVehicle === v.vehicle_id}
                    onClick={() => setSelectedVehicle(v.vehicle_id)}>
                    {v.vehicle_id}
                  </Chip>
                );
              })}
            </>
          )}

          {filterMode === "employee" && (
            <>
              <Chip
                style={{
                  bg: "rgba(148,163,184,0.1)",
                  border: "rgba(148,163,184,0.25)",
                  text: "#94a3b8",
                  accent: "#94a3b8",
                }}
                active={activeEmployee === "ALL"}
                onClick={() => setSelectedEmployee("ALL")}>
                All Employees
              </Chip>
              {allEmployeeIds.map((empId) => {
                const vId = vehicles.find((v) =>
                  v.trips?.some((t) =>
                    t.passengers?.some((p) => p.employee_id === empId),
                  ),
                )?.vehicle_id;
                const p = vId
                  ? vehiclePaletteMap[vId]
                  : {
                      bg: "rgba(148,163,184,0.08)",
                      border: "rgba(148,163,184,0.2)",
                      text: "#94a3b8",
                      accent: "#94a3b8",
                    };
                return (
                  <Chip
                    key={empId}
                    style={p}
                    active={activeEmployee === empId}
                    onClick={() => setSelectedEmployee(empId)}>
                    {empId}
                  </Chip>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {filterMode === "vehicle" && (
        <VehicleView
          vehicles={vehicles}
          inputVehicles={inputVehicles}
          selectedVehicleId={activeVehicle}
        />
      )}

      {filterMode === "employee" && (
        <EmployeeView
          vehicles={vehicles}
          inputEmployees={inputEmployees}
          inputBaseline={inputBaseline}
          selectedEmployeeId={activeEmployee}
        />
      )}
    </div>
  );
}
