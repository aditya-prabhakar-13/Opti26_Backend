import { useRef, useState, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────
   Fonts (shared with rest of app)
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Colour palette — matches map vehicle colours
───────────────────────────────────────────── */
// Light-mode: bg = vivid fill/dot, dim = pale tint, text = darker saturated (AA on white).
const VEHICLE_PALETTE = [
  {
    bg: "#f59e0b",
    dim: "rgba(245,158,11,0.16)",
    border: "rgba(245,158,11,0.55)",
    text: "#b45309",
  }, // amber
  {
    bg: "#3b82f6",
    dim: "rgba(59,130,246,0.16)",
    border: "rgba(59,130,246,0.55)",
    text: "#1d4ed8",
  }, // blue
  {
    bg: "#10b981",
    dim: "rgba(16,185,129,0.16)",
    border: "rgba(16,185,129,0.55)",
    text: "#047857",
  }, // emerald
  {
    bg: "#8b5cf6",
    dim: "rgba(139,92,246,0.16)",
    border: "rgba(139,92,246,0.55)",
    text: "#6d28d9",
  }, // violet
  {
    bg: "#ef4444",
    dim: "rgba(239,68,68,0.16)",
    border: "rgba(239,68,68,0.55)",
    text: "#b91c1c",
  }, // red
  {
    bg: "#06b6d4",
    dim: "rgba(6,182,212,0.16)",
    border: "rgba(6,182,212,0.55)",
    text: "#0e7490",
  }, // cyan
  {
    bg: "#f97316",
    dim: "rgba(249,115,22,0.16)",
    border: "rgba(249,115,22,0.55)",
    text: "#c2410c",
  }, // orange
  {
    bg: "#ec4899",
    dim: "rgba(236,72,153,0.16)",
    border: "rgba(236,72,153,0.55)",
    text: "#be185d",
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

  const tipW = 220;
  const tipH = 180; // Estimated height of tooltip
  const padding = 12;

  // Relative coordinates to the container
  const localAnchorTop = anchorRect.top - containerRect.top;
  const localAnchorBottom = anchorRect.bottom - containerRect.top;
  const localAnchorLeft = anchorRect.left - containerRect.left;
  const localAnchorRight = anchorRect.right - containerRect.left;
  const localAnchorCenterY = (localAnchorTop + localAnchorBottom) / 2;

  // Decide mode: Top -> Bottom -> Side
  let mode = "above";
  const fitsAbove = localAnchorTop > tipH + padding;
  const fitsBelow = (containerRect.height - localAnchorBottom) > tipH + padding;

  if (!fitsAbove) {
    if (fitsBelow) mode = "below";
    else mode = "side";
  }

  const centerX = (localAnchorLeft + localAnchorRight) / 2;
  let left, top, transform;

  if (mode === "side") {
    // Show beside the anchor
    const fitsRight = (containerRect.width - localAnchorRight) > tipW + padding;
    left = fitsRight ? localAnchorRight + 8 : localAnchorLeft - tipW - 8;
    top = localAnchorCenterY;
    transform = "translateY(-50%)";
  } else {
    // Show above or below centered
    left = Math.max(8, Math.min(centerX - tipW / 2, containerRect.width - tipW - 8));
    top = mode === "above" ? localAnchorTop - 8 : localAnchorBottom + 8;
    transform = mode === "above" ? "translateY(-100%)" : "none";
  }

  return (
    <div
      className="absolute z-[1000] pointer-events-none"
      style={{
        left,
        top,
        width: tipW,
        transform,
      }}>
      <div
        className="rounded-md border text-xs shadow-2xl overflow-hidden"
        style={{
          background: "var(--color-paper-2)",
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
          <span className="font-bold [color:var(--color-ink)] truncate">
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

      {/* Arrow - only for Top/Bottom modes */}
      {mode !== "side" && (
        <div
          className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            left: Math.max(20, Math.min(centerX - left, tipW - 20)), // Pin arrow to anchor center relative to tooltip left
            bottom: mode === "above" ? 0 : "auto",
            top: mode === "below" ? 0 : "auto",
            transform: mode === "above" ? "translateY(100%)" : "translateY(-100%)",
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            [mode === "above" ? "borderTop" : "borderBottom"]: `6px solid ${color.border}`,
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--color-muted)] font-medium">{label}</span>
      <span className="font-semibold [color:var(--color-ink)]">{value}</span>
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
        style={{ background: "var(--color-accent)" }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--color-accent)]"
        style={{ background: "var(--color-paper-2)" }}
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
            <div className="w-px h-2 bg-[var(--color-rule-2)]" />
            <span className="text-[10px] font-semibold text-[var(--color-muted)] mt-0.5 whitespace-nowrap">
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
        className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-10 flex flex-col items-center gap-3"
        style={{ fontFamily: "var(--font-body)" }}>
        <div className="w-12 h-12 rounded-md bg-[var(--color-paper-3)] flex items-center justify-center text-[var(--color-faint)]">
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
        <p className="text-[var(--color-muted)] text-sm font-semibold">
          No trips to display
        </p>
        <p className="text-[var(--color-faint)] text-xs">
          Run an optimization to see the timeline.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-2)] backdrop-blur-sm shadow-2xl"
      style={{ fontFamily: "var(--font-body)" }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ background: "var(--color-accent)" }}>
            <svg
              className="w-4 h-4 [color:var(--color-ink)]"
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
            <h2 className="text-sm font-bold [color:var(--color-ink)]">{title}</h2>
            <p className="text-[11px] text-[var(--color-muted)]">
              {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} ·{" "}
              {trips.length} trip{trips.length !== 1 ? "s" : ""}
              {scrubTime != null && (
                <span className="ml-2 text-[var(--color-accent-text)] font-semibold">
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
                <span className="text-[11px] font-semibold text-[var(--color-muted)] max-w-[80px] truncate">
                  {v.id}
                </span>
              </div>
            );
          })}
          {vehicles.length > 5 && (
            <span className="text-[11px] text-[var(--color-faint)]">
              +{vehicles.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* ── Timeline body ── */}
      <div
        className="relative overflow-x-auto overflow-y-visible z-10"
        style={{ minHeight: vehicles.length * ROW_H + 64 }}>
        {/* Label column + track area side by side */}
        <div className="flex min-w-[520px]">
          {/* Vehicle labels */}
          <div
            className="flex-shrink-0 border-r border-[var(--color-rule)] bg-[var(--color-paper-3)]"
            style={{ width: LABEL_W }}>
            {/* Ruler spacer */}
            <div className="h-8 border-b border-[var(--color-rule)]" />
            {vehicles.map((v) => {
              const c = vehicleColor(v.colorIndex);
              return (
                <div
                  key={v.id}
                  className="flex items-center gap-2 px-3"
                  style={{
                    height: ROW_H,
                    borderBottom: "1px solid var(--color-rule)",
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
              className="border-b border-[var(--color-rule)] relative"
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
                      background: "var(--color-rule)",
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
                    borderBottom: "1px solid var(--color-rule)",
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
                              className="text-[10px] font-bold truncate [color:var(--color-ink)]">
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

      </div>

      {/* Floating tooltip - Rendered at root level to bypass scroll clipping */}
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
          containerRect={containerRef.current?.getBoundingClientRect()}
        />
      )}

      {/* ── Footer summary bar ── */}
      <div className="px-6 py-3 border-t border-[var(--color-rule)] bg-[var(--color-paper-3)] flex items-center gap-6 flex-wrap">
        <span className="text-[11px] text-[var(--color-faint)]">
          {fmtTime(minTime)} — {fmtTime(maxTime)}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-[2px] rounded-full bg-[var(--color-accent)]" />
          <span className="text-[11px] text-[var(--color-faint)]">
            Scrub to inspect time
          </span>
        </div>
        <span className="text-[11px] text-[var(--color-faint)] ml-auto">
          Hover a clip for details
        </span>
      </div>
    </div>
  );
}
