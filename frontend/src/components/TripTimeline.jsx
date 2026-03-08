import { useRef, useState, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────
   Fonts (shared with rest of app)
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Colour palette — matches map vehicle colours
───────────────────────────────────────────── */
const VEHICLE_PALETTE = [
  {
    bg: "#f59e0b",
    dim: "rgba(245,158,11,0.18)",
    border: "rgba(245,158,11,0.6)",
    text: "#fbbf24",
  }, // amber
  {
    bg: "#3b82f6",
    dim: "rgba(59,130,246,0.18)",
    border: "rgba(59,130,246,0.6)",
    text: "#60a5fa",
  }, // blue
  {
    bg: "#10b981",
    dim: "rgba(16,185,129,0.18)",
    border: "rgba(16,185,129,0.6)",
    text: "#34d399",
  }, // emerald
  {
    bg: "#8b5cf6",
    dim: "rgba(139,92,246,0.18)",
    border: "rgba(139,92,246,0.6)",
    text: "#a78bfa",
  }, // violet
  {
    bg: "#ef4444",
    dim: "rgba(239,68,68,0.18)",
    border: "rgba(239,68,68,0.6)",
    text: "#f87171",
  }, // red
  {
    bg: "#06b6d4",
    dim: "rgba(6,182,212,0.18)",
    border: "rgba(6,182,212,0.6)",
    text: "#22d3ee",
  }, // cyan
  {
    bg: "#f97316",
    dim: "rgba(249,115,22,0.18)",
    border: "rgba(249,115,22,0.6)",
    text: "#fb923c",
  }, // orange
  {
    bg: "#ec4899",
    dim: "rgba(236,72,153,0.18)",
    border: "rgba(236,72,153,0.6)",
    text: "#f472b6",
  }, // pink
];

function vehicleColor(index) {
  return VEHICLE_PALETTE[index % VEHICLE_PALETTE.length];
}

/* ─────────────────────────────────────────────
   Parse trips into timeline-ready structures.
   Expects trips shaped like:
     { id, vehicleId, startTime, endTime, employeeCount, distanceKm, durationMin, ... }
   Falls back to synthesising fake times from index if missing.
───────────────────────────────────────────── */
function buildTimelineData(trips = []) {
  if (!trips.length) return { vehicles: [], minTime: 0, maxTime: 0 };

  // Group by vehicle
  const vehicleMap = new Map();
  trips.forEach((trip) => {
    const vid = trip.vehicleId ?? trip.vehicle_id ?? "Unknown";
    if (!vehicleMap.has(vid)) vehicleMap.set(vid, []);
    vehicleMap.get(vid).push(trip);
  });

  // Resolve start/end times (minutes from midnight)
  function toMinutes(val) {
    if (val == null) return null;
    if (typeof val === "number") return val;
    // "HH:MM" or "HH:MM:SS"
    const parts = String(val).split(":").map(Number);
    return parts[0] * 60 + (parts[1] ?? 0) + (parts[2] ?? 0) / 60;
  }

  let globalMin = Infinity;
  let globalMax = -Infinity;

  const vehicles = Array.from(vehicleMap.entries()).map(([vid, vTrips], vi) => {
    const resolved = vTrips.map((trip, ti) => {
      let start = toMinutes(
        trip.startTime ?? trip.start_time ?? trip.departure_time,
      );
      let end = toMinutes(trip.endTime ?? trip.end_time ?? trip.arrival_time);
      const dur =
        trip.durationMin ?? trip.duration_min ?? trip.duration_minutes ?? null;

      // Synthesise times if missing
      if (start == null) start = 360 + vi * 40 + ti * 60; // 6am staggered
      if (end == null) end = dur != null ? start + dur : start + 45;

      if (start < globalMin) globalMin = start;
      if (end > globalMax) globalMax = end;

      return { ...trip, _start: start, _end: end };
    });

    return { id: vid, trips: resolved, colorIndex: vi };
  });

  // Sensible fallback bounds
  if (!isFinite(globalMin)) globalMin = 360;
  if (!isFinite(globalMax)) globalMax = 1200;

  // Add 5% padding either side
  const span = globalMax - globalMin;
  const pad = Math.max(span * 0.05, 15);

  return {
    vehicles,
    minTime: globalMin - pad,
    maxTime: globalMax + pad,
  };
}

/* ─────────────────────────────────────────────
   Format helpers
───────────────────────────────────────────── */
function fmtTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function fmtDur(minutes) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/* ─────────────────────────────────────────────
   Tooltip
───────────────────────────────────────────── */
function Tooltip({ trip, color, anchorRect, containerRect }) {
  if (!trip || !anchorRect || !containerRect) return null;

  const dur = trip._end - trip._start;
  const employees =
    trip.employeeCount ?? trip.employee_count ?? trip.passengers ?? null;
  const distance = trip.distanceKm ?? trip.distance_km ?? trip.distance ?? null;
  const stops = trip.stops ?? trip.stop_count ?? null;

  // Position: prefer above, fall back below
  const tipW = 220;
  const clipLeft = anchorRect.left - containerRect.left;
  const clipRight = anchorRect.right - containerRect.left;
  const centerX = (clipLeft + clipRight) / 2;
  let left = centerX - tipW / 2;
  left = Math.max(8, Math.min(left, containerRect.width - tipW - 8));

  const aboveY = anchorRect.top - containerRect.top - 8;
  const belowY = anchorRect.bottom - containerRect.top + 8;
  const showAbove = aboveY > 120;
  const top = showAbove ? aboveY : belowY;

  return (
    <div
      className="absolute z-500 pointer-events-none"
      style={{
        left,
        top,
        width: tipW,
        transform: showAbove ? "translateY(-100%)" : "none",
      }}>
      <div
        className="rounded-md border text-xs shadow-2xl overflow-hidden"
        style={{
          background: "rgba(15,22,35,0.97)",
          borderColor: color.border,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${color.border}`,
          backdropFilter: "blur(12px)",
        }}>
        {/* Header */}
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{
            background: color.dim,
            borderBottom: `1px solid ${color.border}`,
          }}>
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: color.bg }}
          />
          <span className="font-bold text-white truncate">
            Trip {trip.id ?? trip.tripId ?? "—"}
          </span>
          <span className="ml-auto font-semibold" style={{ color: color.text }}>
            {fmtDur(dur)}
          </span>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2">
          <Row label="Departure" value={fmtTime(trip._start)} color={color} />
          <Row label="Arrival" value={fmtTime(trip._end)} color={color} />
          {employees != null && (
            <Row label="Employees" value={employees} color={color} />
          )}
          {distance != null && (
            <Row
              label="Distance"
              value={`${Number(distance).toFixed(1)} km`}
              color={color}
            />
          )}
          {stops != null && <Row label="Stops" value={stops} color={color} />}
        </div>
      </div>

      {/* Arrow */}
      {showAbove && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0"
          style={{
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: `6px solid ${color.border}`,
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Playhead / scrubber
───────────────────────────────────────────── */
function Playhead({ pct }) {
  return (
    <div
      className="absolute top-0 bottom-0 z-30 pointer-events-none"
      style={{ left: `${pct * 100}%` }}>
      <div
        className="absolute top-0 w-[2px] h-full -translate-x-1/2"
        style={{ background: "rgba(245,158,11,0.7)" }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-amber-500"
        style={{ background: "#06080a" }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Time ruler ticks
───────────────────────────────────────────── */
function TimeRuler({ minTime, maxTime, width }) {
  const span = maxTime - minTime;
  // Pick a nice tick interval
  const intervals = [15, 30, 60, 120, 180, 240];
  const targetTicks = Math.max(4, Math.floor(width / 90));
  const interval = intervals.find((iv) => span / iv <= targetTicks) ?? 240;

  const first = Math.ceil(minTime / interval) * interval;
  const ticks = [];
  for (let t = first; t <= maxTime; t += interval) {
    ticks.push(t);
  }

  return (
    <div className="relative h-8 flex-shrink-0" style={{ marginLeft: 0 }}>
      {ticks.map((t) => {
        const pct = ((t - minTime) / span) * 100;
        return (
          <div
            key={t}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
            <div className="w-px h-2 bg-slate-600" />
            <span className="text-[10px] font-semibold text-slate-500 mt-0.5 whitespace-nowrap">
              {fmtTime(t)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main TripTimeline component
───────────────────────────────────────────── */
export default function TripTimeline({ trips = [], title = "Trip Timeline" }) {
  const { vehicles, minTime, maxTime } = buildTimelineData(trips);
  const span = maxTime - minTime;

  const [hovered, setHovered] = useState(null); // { trip, anchorRect }
  const [scrubPct, setScrubPct] = useState(null);
  const [scrubTime, setScrubTime] = useState(null);
  const [rulerWidth, setRulerWidth] = useState(600);

  const containerRef = useRef(null);
  const trackAreaRef = useRef(null);

  // Measure track area width for ruler
  useEffect(() => {
    if (!trackAreaRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setRulerWidth(entry.contentRect.width);
    });
    ro.observe(trackAreaRef.current);
    return () => ro.disconnect();
  }, []);

  const handleTrackMouseMove = useCallback(
    (e) => {
      if (!trackAreaRef.current) return;
      const rect = trackAreaRef.current.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      setScrubPct(pct);
      setScrubTime(minTime + pct * span);
    },
    [minTime, span],
  );

  const handleTrackMouseLeave = useCallback(() => {
    setScrubPct(null);
    setScrubTime(null);
  }, []);

  const LABEL_W = 120; // px for vehicle label column
  const ROW_H = 52; // px per track row

  if (!vehicles.length) {
    return (
      <div
        className="rounded-md border border-slate-700/60 bg-[#0a0c10] p-10 flex flex-col items-center gap-3"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="w-12 h-12 rounded-md bg-slate-800 flex items-center justify-center text-slate-600">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-12m12 0v4.5m-12-4.5v4.5"
            />
          </svg>
        </div>
        <p className="text-slate-500 text-sm font-semibold">
          No trips to display
        </p>
        <p className="text-slate-600 text-xs">
          Run an optimization to see the timeline.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-md border border-slate-700/60 bg-[#0a0c10] backdrop-blur-sm shadow-2xl overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-[#0c0e12]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ background: "var(--color-accent)" }}>
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-12m12 0v4.5m-12-4.5v4.5"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{title}</h2>
            <p className="text-[11px] text-slate-500">
              {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} ·{" "}
              {trips.length} trip{trips.length !== 1 ? "s" : ""}
              {scrubTime != null && (
                <span className="ml-2 text-amber-400 font-semibold">
                  · {fmtTime(scrubTime)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-4 flex-wrap">
          {vehicles.slice(0, 5).map((v) => {
            const c = vehicleColor(v.colorIndex);
            return (
              <div key={v.id} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: c.bg }}
                />
                <span className="text-[11px] font-semibold text-slate-400 max-w-[80px] truncate">
                  {v.id}
                </span>
              </div>
            );
          })}
          {vehicles.length > 5 && (
            <span className="text-[11px] text-slate-600">
              +{vehicles.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* ── Timeline body ── */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-visible"
        style={{ minHeight: vehicles.length * ROW_H + 64 }}>
        {/* Label column + track area side by side */}
        <div className="flex min-w-[520px]">
          {/* Vehicle labels */}
          <div
            className="flex-shrink-0 border-r border-slate-700/50 bg-slate-900/40"
            style={{ width: LABEL_W }}>
            {/* Ruler spacer */}
            <div className="h-8 border-b border-slate-700/30" />
            {vehicles.map((v) => {
              const c = vehicleColor(v.colorIndex);
              return (
                <div
                  key={v.id}
                  className="flex items-center gap-2 px-3"
                  style={{
                    height: ROW_H,
                    borderBottom: "1px solid rgba(148,163,184,0.06)",
                  }}>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: c.bg, boxShadow: `0 0 6px ${c.bg}` }}
                  />
                  <span
                    className="text-xs font-bold truncate"
                    style={{ color: c.text }}
                    title={v.id}>
                    {v.id}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track area */}
          <div
            ref={trackAreaRef}
            className="flex-1 relative select-none cursor-crosshair"
            onMouseMove={handleTrackMouseMove}
            onMouseLeave={handleTrackMouseLeave}>
            {/* Time ruler */}
            <div
              className="border-b border-slate-700/30 relative"
              style={{ height: 32 }}>
              <TimeRuler
                minTime={minTime}
                maxTime={maxTime}
                width={rulerWidth}
              />
            </div>

            {/* Grid lines (hour marks) */}
            {(() => {
              const ticks = [];
              const first = Math.ceil(minTime / 60) * 60;
              for (let t = first; t <= maxTime; t += 60) {
                const pct = ((t - minTime) / span) * 100;
                ticks.push(
                  <div
                    key={t}
                    className="absolute top-0 bottom-0 w-px"
                    style={{
                      left: `${pct}%`,
                      background: "rgba(148,163,184,0.06)",
                    }}
                  />,
                );
              }
              return ticks;
            })()}

            {/* Scrub overlay line */}
            {scrubPct != null && <Playhead pct={scrubPct} />}

            {/* Vehicle rows */}
            {vehicles.map((v) => {
              const c = vehicleColor(v.colorIndex);
              return (
                <div
                  key={v.id}
                  className="relative"
                  style={{
                    height: ROW_H,
                    borderBottom: "1px solid rgba(148,163,184,0.06)",
                  }}>
                  {/* Row hover band */}
                  <div
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                    style={{ background: c.dim }}
                  />

                  {/* Trip clips */}
                  {v.trips.map((trip) => {
                    const left = ((trip._start - minTime) / span) * 100;
                    const width = Math.max(
                      ((trip._end - trip._start) / span) * 100,
                      0.4,
                    );
                    if (trip._end - trip._start <= 0) return null; // skip zero-length trips

                    const isHovered =
                      hovered?.trip?.id === trip.id &&
                      hovered?.trip?.vehicleId === trip.vehicleId;

                    return (
                      <div
                        key={trip.id ?? `${trip._start}-${trip._end}`}
                        className="absolute top-1/2 rounded-md cursor-pointer transition-all duration-150"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          height: ROW_H * 0.9,
                          background: isHovered
                            ? c.bg
                            : `${c.bg}73`, // ~45% opacity for better visibility while flat
                          border: `1px solid ${isHovered ? c.bg : c.border}`,
                          boxShadow: isHovered
                            ? `0 0 16px ${c.bg}66, 0 2px 8px rgba(0,0,0,0.4)`
                            : `0 1px 4px rgba(0,0,0,0.3)`,
                          zIndex: isHovered ? 20 : 10,
                          transform: `translateY(-50%) scaleY(${isHovered ? 1.12 : 1})`,
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const cRect =
                            containerRef.current?.getBoundingClientRect();
                          setHovered({
                            trip,
                            anchorRect: rect,
                            containerRect: cRect,
                          });
                        }}
                        onMouseLeave={() => setHovered(null)}>
                        {/* Inner label — only shown if clip is wide enough */}
                        {width > 4 && (
                          <div className="absolute inset-0 flex items-center px-2 overflow-hidden pointer-events-none">
                            <span
                              className="text-[10px] font-bold truncate text-white">
                              {fmtDur(trip._end - trip._start)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating tooltip */}
        {hovered && (
          <Tooltip
            trip={hovered.trip}
            color={vehicleColor(
              vehicles.find(
                (v) =>
                  v.id === (hovered.trip.vehicleId ?? hovered.trip.vehicle_id),
              )?.colorIndex ?? 0,
            )}
            anchorRect={hovered.anchorRect}
            containerRect={hovered.containerRect}
          />
        )}
      </div>

      {/* ── Footer summary bar ── */}
      <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-900/30 flex items-center gap-6 flex-wrap">
        <span className="text-[11px] text-slate-600">
          {fmtTime(minTime)} — {fmtTime(maxTime)}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-[2px] rounded-full bg-amber-400/70" />
          <span className="text-[11px] text-slate-600">
            Scrub to inspect time
          </span>
        </div>
        <span className="text-[11px] text-slate-600 ml-auto">
          Hover a clip for details
        </span>
      </div>
    </div>
  );
}
