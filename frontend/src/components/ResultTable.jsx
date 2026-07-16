import { useState, useMemo, useEffect } from "react";

/* ── Fonts (injected once) ── */

// ─── Constants ────────────────────────────────────────────────────────────────

// Light-mode categorical palette: saturated accent/dot for fills, pale tint bg,
// darker saturated text for AA legibility on white.
const VEHICLE_PALETTE = [
  {
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.4)",
    text: "#b45309",
    soft: "rgba(245,158,11,0.09)",
  },
  {
    accent: "#0ea5e9",
    bg: "rgba(14,165,233,0.12)",
    border: "rgba(14,165,233,0.4)",
    text: "#0369a1",
    soft: "rgba(14,165,233,0.09)",
  },
  {
    accent: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.4)",
    text: "#6d28d9",
    soft: "rgba(139,92,246,0.09)",
  },
  {
    accent: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.4)",
    text: "#047857",
    soft: "rgba(16,185,129,0.09)",
  },
  {
    accent: "#f43f5e",
    bg: "rgba(244,63,94,0.12)",
    border: "rgba(244,63,94,0.4)",
    text: "#be123c",
    soft: "rgba(244,63,94,0.09)",
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
  1: { bg: "rgba(244,63,94,0.14)", text: "#be123c", dot: "#f43f5e" },
  2: { bg: "rgba(245,158,11,0.16)", text: "#b45309", dot: "#f59e0b" },
  3: { bg: "rgba(14,165,233,0.14)", text: "#0369a1", dot: "#0ea5e9" },
  4: { bg: "rgba(16,185,129,0.14)", text: "#047857", dot: "#10b981" },
  5: { bg: "rgba(100,116,139,0.14)", text: "#475569", dot: "#64748b" },
};

// Switch to dropdown above this many items
const CHIPS_THRESHOLD = 10;

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

// ─── Shared sub-components ────────────────────────────────────────────────────

function Chip({ children, style, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 whitespace-nowrap"
      style={{
        border: `1px solid ${active ? style.border : "var(--color-rule-2)"}`,
        background: active ? style.bg : "var(--color-paper-2)",
        color: active ? style.text : "var(--color-muted)",
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
      <span className="text-[10px]" style={{ color: "var(--color-faint)" }}>
        START
      </span>
      {stops.map((stop, i) => (
        <span key={i} className="flex items-center gap-1">
          <span
            className="text-[10px]"
            style={{ color: "var(--color-faint)" }}>
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
      <span className="text-[10px]" style={{ color: "var(--color-faint)" }}>
        →
      </span>
      <span className="text-[10px]" style={{ color: "var(--color-faint)" }}>
        END
      </span>
    </div>
  );
}

// ─── FilterControl ────────────────────────────────────────────────────────────
/*
  Renders chip buttons when items.length <= CHIPS_THRESHOLD,
  or a styled <select> dropdown when items.length > CHIPS_THRESHOLD.

  Props:
    items       [{ value, label }]
    allValue    string — e.g. "ALL"
    allLabel    string — e.g. "All Employees"
    selected    string — current value
    onChange    (value) => void
    paletteMap  { [value]: palette } — for coloured chips / active pill
*/
function FilterControl({
  items,
  allValue,
  allLabel,
  selected,
  onChange,
  paletteMap = {},
}) {
  const neutral = {
    bg: "var(--color-rule)",
    border: "var(--color-faint)",
    text: "#94a3b8",
    accent: "#94a3b8",
  };

  if (items.length > CHIPS_THRESHOLD) {
    const activePalette =
      selected !== allValue ? (paletteMap[selected] ?? neutral) : null;

    return (
      <div className="flex items-center gap-3 flex-wrap">
        {/* Styled select */}
        <div className="relative">
          <select
            value={selected}
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2 rounded-md text-xs font-bold cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2"
            style={{
              background: "var(--color-paper-3)",
              border: `1px solid ${activePalette ? activePalette.border : "var(--color-rule-2)"}`,
              color: activePalette
                ? activePalette.text
                : "var(--color-ink-2)",
              boxShadow: activePalette
                ? `0 0 12px 0 ${activePalette.accent}22`
                : "none",
              // focus ring colour
              "--tw-ring-color": activePalette
                ? activePalette.border
                : "var(--color-faint)",
            }}>
            <option value={allValue}>{allLabel}</option>
            {items.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {/* Chevron */}
          <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3"
            style={{
              color: activePalette
                ? activePalette.text
                : "var(--color-muted)",
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {/* Active selection pill with clear button */}
        {selected !== allValue && activePalette && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold"
            style={{
              background: activePalette.bg,
              border: `1px solid ${activePalette.border}`,
              color: activePalette.text,
            }}>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: activePalette.accent }}
            />
            {items.find((i) => i.value === selected)?.label ?? selected}
            <button
              type="button"
              onClick={() => onChange(allValue)}
              className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity leading-none"
              aria-label="Clear filter">
              ✕
            </button>
          </div>
        )}

        <span
          className="text-[10px] font-semibold"
          style={{ color: "var(--color-faint)" }}>
          {items.length} total
        </span>
      </div>
    );
  }

  // ── Chip mode (≤ threshold) ──
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Chip
        style={neutral}
        active={selected === allValue}
        onClick={() => onChange(allValue)}>
        {allLabel}
      </Chip>
      {items.map(({ value, label }) => {
        const p = paletteMap[value] ?? neutral;
        return (
          <Chip
            key={value}
            style={{
              bg: p.bg,
              border: p.border,
              text: p.text,
              accent: p.accent,
            }}
            active={selected === value}
            onClick={() => onChange(value)}>
            {label}
          </Chip>
        );
      })}
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
        className="flex items-center justify-center py-16 rounded-md"
        style={{
          border: "1px solid var(--color-rule)",
          background: "var(--color-paper-2)",
        }}>
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-faint)" }}>
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
            className="rounded-md overflow-hidden"
            style={{
              border: `1px solid ${palette.border}`,
              background: "var(--color-paper-2)",
            }}>
            {/* Header */}
            <div
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{
                background: palette.bg,
                borderBottom: `1px solid ${palette.border}`,
              }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: palette.accent, color: "#0f172a" }}>
                  {vehicle.vehicle_id}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold [color:var(--color-ink)] text-base">
                      {vehicle.vehicle_id}
                    </span>
                    <Badge
                      color={
                        vehicle.category === "premium" ? "#b45309" : "#475569"
                      }>
                      {vehicle.category}
                    </Badge>
                    {inputV && (
                      <Badge color="#0369a1">{inputV.vehicle_type}</Badge>
                    )}
                    {inputV && (
                      <Badge
                        color={
                          inputV.fuel_type === "electric"
                            ? "#047857"
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
                          style={{ color: "var(--color-muted)" }}>
                          Cap:{" "}
                          <span className="font-semibold [color:var(--color-ink)]">
                            {inputV.capacity}
                          </span>
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-muted)" }}>
                          Speed:{" "}
                          <span className="font-semibold [color:var(--color-ink)]">
                            {inputV.avg_speed_kmph} km/h
                          </span>
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-muted)" }}>
                          Rate:{" "}
                          <span className="font-semibold [color:var(--color-ink)]">
                            ₹{inputV.cost_per_km}/km
                          </span>
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-muted)" }}>
                          Available:{" "}
                          <span className="font-semibold [color:var(--color-ink)]">
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
                    Total Objective Cost
                  </p>
                  <p className="text-xl font-bold [color:var(--color-ink)]">
                    {fmtCost(vehicle.total_cost)}
                  </p>
                </div>
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--color-muted)" }}>
                    Trips
                  </p>
                  <p className="text-xl font-bold [color:var(--color-ink)]">
                    {vehicle.trips?.length ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Trips */}
            <div
              className="divide-y"
              style={{ borderColor: "var(--color-rule)" }}>
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
                        <span className="text-sm font-bold [color:var(--color-ink)]">
                          Trip {trip.trip_number}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                            style={{
                              background: "var(--color-paper-3)",
                              color: "var(--color-ink-2)",
                            }}>
                            {fmtTime(trip.start_time)} →{" "}
                            {fmtTime(trip.end_time)}
                          </span>
                          {duration != null && (
                            <span
                              className="text-xs"
                              style={{ color: "var(--color-muted)" }}>
                              {durationLabel(duration)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs flex-wrap">
                        <span style={{ color: "var(--color-muted)" }}>
                          Distance:{" "}
                          <span className="font-semibold [color:var(--color-ink)]">
                            {fmtDist(trip.trip_distance_km)}
                          </span>
                        </span>
                        <span style={{ color: "var(--color-muted)" }}>
                          Cost:{" "}
                          <span
                            className="font-bold"
                            style={{ color: palette.text }}>
                            {fmtCost(trip.trip_cost)}
                          </span>
                        </span>
                        <span style={{ color: "var(--color-muted)" }}>
                          Load:{" "}
                          <span className="font-semibold [color:var(--color-ink)]">
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
                                borderBottom: "1px solid var(--color-rule)",
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
                                  style={{ color: "var(--color-muted)" }}>
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
                                        ? "1px solid var(--color-rule)"
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
                                  <td className="py-2.5 pr-4 font-semibold [color:var(--color-ink)]">
                                    {fmtTime(p.pickup_time)}
                                  </td>
                                  <td className="py-2.5 pr-4 font-semibold [color:var(--color-ink)]">
                                    {fmtTime(p.drop_time)}
                                  </td>
                                  <td className="py-2.5">
                                    <span
                                      className="text-xs"
                                      style={{
                                        color: "var(--color-muted)",
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
          if (!map[p.employee_id])
            map[p.employee_id] = { vehicle, palette, trip, passenger: p };
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
        className="flex items-center justify-center py-16 rounded-md"
        style={{
          border: "1px solid var(--color-rule)",
          background: "var(--color-paper-2)",
        }}>
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-faint)" }}>
          No employees found for current selection.
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-md"
      style={{ border: "1px solid var(--color-rule)" }}>
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr
            style={{
              background: "var(--color-paper-3)",
              borderBottom: "1px solid var(--color-rule)",
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
                style={{ color: "var(--color-muted)" }}>
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
                      ? "var(--color-paper-2)"
                      : "var(--color-paper)",
                  borderBottom: "1px solid var(--color-rule)",
                }}>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center justify-center w-14 py-1.5 rounded-md text-xs font-bold"
                    style={
                      palette
                        ? {
                          background: palette.soft,
                          color: palette.text,
                          border: `1px solid ${palette.border}`,
                        }
                        : {
                          background: "var(--color-rule)",
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
                        style={{ color: "var(--color-muted)" }}>
                        Trip {assignment.trip.trip_number}
                      </span>
                    </div>
                  ) : (
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-faint)" }}>
                      Unrouted
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold [color:var(--color-ink)] text-xs">
                  {assignment ? fmtTime(assignment.passenger.pickup_time) : "—"}
                </td>
                <td className="px-4 py-3 font-semibold [color:var(--color-ink)] text-xs">
                  {assignment ? fmtTime(assignment.passenger.drop_time) : "—"}
                </td>
                <td
                  className="px-4 py-3 text-xs"
                  style={{ color: "var(--color-muted)" }}>
                  {durationLabel(rideDuration)}
                </td>
                <td
                  className="px-4 py-3 text-xs"
                  style={{ color: "var(--color-muted)" }}>
                  {empInput?.earliest_pickup ?? "—"}
                </td>
                <td
                  className="px-4 py-3 text-xs"
                  style={{ color: "var(--color-muted)" }}>
                  {empInput?.latest_drop ?? "—"}
                </td>
                <td
                  className="px-4 py-3 text-xs"
                  style={{ color: "var(--color-muted)" }}>
                  {baseline ? fmtCost(baseline.baseline_cost) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {empInput?.vehicle_preference && (
                      <Badge color="#6d28d9">
                        {empInput.vehicle_preference}
                      </Badge>
                    )}
                    {empInput?.sharing_preference && (
                      <Badge color="#0369a1">
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
      color: "#047857",
    },
    {
      label: "Optimized Cost",
      value: fmtCost(summary.total_optimized_cost),
      color: "#f59e0b",
    },
    {
      label: "Baseline Cost",
      value: fmtCost(summary.total_baseline_cost),
      color: "var(--color-muted)",
    },
    {
      label: "Net Savings",
      value: fmtCost(summary.net_savings),
      color: "#047857",
    },
    {
      label: "Savings %",
      value: `${Number(summary.savings_percentage).toFixed(1)}%`,
      color: "#047857",
    },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map(({ label, value, color }) => (
        <div
          key={label}
          className="rounded-md px-4 py-3"
          style={{
            background: "var(--color-paper-2)",
            border: "1px solid var(--color-rule)",
          }}>
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--color-muted)" }}>
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

  const resultId = selectedResult?.id;
  useEffect(() => {
    setFilterMode("vehicle");
    setSelectedVehicle("ALL");
    setSelectedEmployee("ALL");
  }, [resultId]);

  const result =
    selectedResult?.[
    mapMode === "optimized"
      ? "result"
      : mapMode === "infeasible"
        ? "resultInfeasible"
        : "resultNoConstraints"
    ];

  if (!result) {
    return (
      <div
        className="flex items-center justify-center py-24"
        style={{ fontFamily: "var(--font-body)" }}>
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-muted)" }}>
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

  const vehiclePaletteMap = {};
  vehicles.forEach((v, i) => {
    vehiclePaletteMap[v.vehicle_id] =
      VEHICLE_PALETTE[i % VEHICLE_PALETTE.length];
  });

  const activeVehicle = vehicles.some((v) => v.vehicle_id === selectedVehicle)
    ? selectedVehicle
    : "ALL";
  const activeEmployee = allEmployeeIds.includes(selectedEmployee)
    ? selectedEmployee
    : "ALL";

  // Item arrays for FilterControl
  const vehicleItems = vehicles.map((v) => ({
    value: v.vehicle_id,
    label: v.vehicle_id,
  }));
  const employeeItems = allEmployeeIds.map((id) => ({ value: id, label: id }));

  // Employee → palette (via their assigned vehicle)
  const employeePaletteMap = {};
  allEmployeeIds.forEach((id) => {
    const vId = vehicles.find((v) =>
      v.trips?.some((t) => t.passengers?.some((p) => p.employee_id === id)),
    )?.vehicle_id;
    if (vId) employeePaletteMap[id] = vehiclePaletteMap[vId];
  });

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--color-accent-text)" }}>
            Optimization Results
          </p>
          <h2
            className="text-2xl font-bold [color:var(--color-ink)] mt-0.5"
            style={{ fontFamily: "var(--font-display)" }}>
            Route Breakdown
          </h2>
        </div>
        {/* <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold self-start"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "#fbbf24",
          }}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Constrained Optimization
        </div> */}
      </div>

      {/* Summary */}
      {/* <SummaryBar summary={summary} /> */}

      {/* Filter bar */}
      <div
        className="rounded-md px-5 py-4 space-y-4"
        style={{
          background: "var(--color-paper-2)",
          border: "1px solid var(--color-rule)",
        }}>
        {/* Mode toggle */}
        <div
          className="flex items-center p-1 rounded-md gap-1 w-fit"
          style={{
            background: "var(--color-paper-3)",
            border: "1px solid var(--color-rule)",
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
                    background: "var(--color-accent)",
                    color: "var(--color-accent-ink)",
                    boxShadow: "var(--shadow-sm)",
                  }
                  : { color: "var(--color-muted)" }
              }>
              {label}
            </button>
          ))}
        </div>

        {/* Filter control — auto chips vs dropdown */}
        <div>
          <span
            className="text-[10px] font-bold uppercase tracking-widest mb-2.5 block"
            style={{ color: "var(--color-faint)" }}>
            Filter:
          </span>

          {filterMode === "vehicle" && (
            <FilterControl
              items={vehicleItems}
              allValue="ALL"
              allLabel="All Vehicles"
              selected={activeVehicle}
              onChange={setSelectedVehicle}
              paletteMap={vehiclePaletteMap}
            />
          )}
          {filterMode === "employee" && (
            <FilterControl
              items={employeeItems}
              allValue="ALL"
              allLabel="All Employees"
              selected={activeEmployee}
              onChange={setSelectedEmployee}
              paletteMap={employeePaletteMap}
            />
          )}
        </div>
      </div>

      {/* Content */}
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
