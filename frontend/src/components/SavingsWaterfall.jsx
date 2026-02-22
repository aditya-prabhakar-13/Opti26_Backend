import { useState, useRef, useEffect, useMemo } from "react";

/*
  SavingsWaterfall
  ────────────────
  Props:
    selectedResult — the full selectedResult object (same as ResultsTableView)
    mapMode        — "optimized" | "noconstraints" | "infeasible"

  Reads from result.summary:
    total_baseline_cost, total_optimized_cost, net_savings, savings_percentage
  Reads from result.vehicles[]:
    vehicle_id, total_cost
  Reads from result.input.baseline[]:
    employee_id, baseline_cost  (to get per-vehicle baseline)
*/

/* ── Shared palette (must match ResultsTableView / TripTimeline) ── */
const VEHICLE_PALETTE = [
  {
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.18)",
    border: "rgba(245,158,11,0.45)",
    text: "#fbbf24",
    glow: "rgba(245,158,11,0.25)",
  },
  {
    accent: "#38bdf8",
    bg: "rgba(56,189,248,0.18)",
    border: "rgba(56,189,248,0.45)",
    text: "#7dd3fc",
    glow: "rgba(56,189,248,0.25)",
  },
  {
    accent: "#a78bfa",
    bg: "rgba(167,139,250,0.18)",
    border: "rgba(167,139,250,0.45)",
    text: "#c4b5fd",
    glow: "rgba(167,139,250,0.25)",
  },
  {
    accent: "#34d399",
    bg: "rgba(52,211,153,0.18)",
    border: "rgba(52,211,153,0.45)",
    text: "#6ee7b7",
    glow: "rgba(52,211,153,0.25)",
  },
  {
    accent: "#fb7185",
    bg: "rgba(251,113,133,0.18)",
    border: "rgba(251,113,133,0.45)",
    text: "#fda4af",
    glow: "rgba(251,113,133,0.25)",
  },
  {
    accent: "#f97316",
    bg: "rgba(249,115,22,0.18)",
    border: "rgba(249,115,22,0.45)",
    text: "#fb923c",
    glow: "rgba(249,115,22,0.25)",
  },
  {
    accent: "#06b6d4",
    bg: "rgba(6,182,212,0.18)",
    border: "rgba(6,182,212,0.45)",
    text: "#22d3ee",
    glow: "rgba(6,182,212,0.25)",
  },
  {
    accent: "#ec4899",
    bg: "rgba(236,72,153,0.18)",
    border: "rgba(236,72,153,0.45)",
    text: "#f472b6",
    glow: "rgba(236,72,153,0.25)",
  },
];

/* ── Formatters ── */
function fmtCost(n) {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}₹${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}k`;
  return `${sign}₹${abs.toFixed(0)}`;
}

function fmtPct(n) {
  if (n == null) return "";
  return `${Number(n).toFixed(1)}%`;
}

/* ── Data builder ── */
function buildWaterfallData(selectedResult, mapMode) {
  const result =
    selectedResult?.[
      mapMode === "optimized"
        ? "result"
        : mapMode === "infeasible"
          ? "resultInfeasible"
          : "resultNoConstraints"
    ];
  if (!result) return null;

  const { summary, vehicles = [], input } = result;
  const baseline = summary?.total_baseline_cost ?? 0;
  const optimized = summary?.total_optimized_cost ?? 0;
  const netSavings = summary?.net_savings ?? baseline - optimized;
  const savingsPct =
    summary?.savings_percentage ??
    (baseline > 0 ? (netSavings / baseline) * 100 : 0);

  // Per-vehicle baseline: sum their passengers' baseline costs from input.baseline
  const empBaseline = {};
  (input?.baseline ?? []).forEach((b) => {
    empBaseline[b.employee_id] = b.baseline_cost ?? 0;
  });

  // Compute per-vehicle: baseline = sum of passenger baseline costs, saving = baseline - optimized
  const vehicleSegments = vehicles.map((v, i) => {
    const palette = VEHICLE_PALETTE[i % VEHICLE_PALETTE.length];

    // Sum baseline costs for all passengers across all trips of this vehicle
    let vBaseline = 0;
    v.trips?.forEach((trip) => {
      trip.passengers?.forEach((p) => {
        vBaseline += empBaseline[p.employee_id] ?? 0;
      });
    });

    const vOptimized = v.total_cost ?? 0;
    const vSaving = vBaseline - vOptimized;

    return {
      id: v.vehicle_id,
      palette,
      baseline: vBaseline,
      optimized: vOptimized,
      saving: vSaving,
    };
  });

  return { baseline, optimized, netSavings, savingsPct, vehicleSegments };
}

/* ── Animated number ── */
function useAnimatedValue(target, duration = 800) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  const start = useRef(null);
  const from = useRef(0);

  useEffect(() => {
    from.current = display;
    start.current = null;
    const tick = (ts) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(from.current + (target - from.current) * ease);
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  return display;
}

/* ── Tooltip ── */
function WfTooltip({ bar, containerWidth }) {
  if (!bar) return null;
  const TIP_W = 210;
  let left = bar.cx - TIP_W / 2;
  left = Math.max(8, Math.min(left, containerWidth - TIP_W - 8));
  const isAbove = bar.y > 160;
  const top = isAbove ? bar.y - 12 : bar.y + bar.h + 12;

  return (
    <div
      className="absolute pointer-events-none z-40 text-xs rounded-2xl overflow-hidden"
      style={{
        left,
        width: TIP_W,
        top,
        transform: isAbove ? "translateY(-100%)" : "none",
        background: "rgba(13,19,30,0.98)",
        border: `1px solid ${bar.palette.border}`,
        boxShadow: `0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px ${bar.palette.border}`,
        backdropFilter: "blur(16px)",
      }}>
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{
          background: bar.palette.bg,
          borderBottom: `1px solid ${bar.palette.border}`,
        }}>
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: bar.palette.accent }}
        />
        <span className="font-bold text-white">{bar.label}</span>
        {bar.savingPct != null && (
          <span
            className="ml-auto font-bold text-xs"
            style={{ color: bar.palette.text }}>
            -{fmtPct(bar.savingPct)} saved
          </span>
        )}
      </div>
      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {bar.tooltipRows.map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="text-slate-500">{label}</span>
            <span className="font-bold" style={{ color: color ?? "#fff" }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function SavingsWaterfall({
  selectedResult,
  mapMode = "optimized",
}) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(700);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(
    () => buildWaterfallData(selectedResult, mapMode),
    [selectedResult, mapMode],
  );

  const animBaseline = useAnimatedValue(data?.baseline ?? 0);
  const animOptimized = useAnimatedValue(data?.optimized ?? 0);
  const animSavings = useAnimatedValue(data?.netSavings ?? 0);

  if (!data) {
    return (
      <div
        className="rounded-3xl border border-slate-700/60 bg-slate-800/40 flex items-center justify-center py-16"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <p className="text-sm font-semibold text-slate-500">
          No data available for this view.
        </p>
      </div>
    );
  }

  const { baseline, optimized, netSavings, savingsPct, vehicleSegments } = data;

  /* ── Chart geometry ── */
  const PAD_LEFT = 72;
  const PAD_RIGHT = 24;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 64;
  const chartW = Math.max(width - PAD_LEFT - PAD_RIGHT, 200);
  const chartH = 240;
  const svgH = chartH + PAD_TOP + PAD_BOTTOM;

  // Columns: Baseline | vehicle savings... | Optimized
  const totalCols = 2 + vehicleSegments.length;
  const GAP = Math.max(8, Math.min(16, chartW / totalCols / 5));
  const barW = Math.max(24, (chartW - GAP * (totalCols + 1)) / totalCols);

  const maxVal = baseline * 1.05;
  const yScale = (v) => chartH - (v / maxVal) * chartH;
  const xPos = (i) => PAD_LEFT + GAP + i * (barW + GAP);

  // Y-axis ticks
  const tickCount = 5;
  const yTicks = Array.from(
    { length: tickCount + 1 },
    (_, i) => (maxVal * i) / tickCount,
  );

  // Build bar descriptors
  // Waterfall: baseline bar sits on 0. Each vehicle saving "hangs" from the running top.
  // Final bar = optimized, from 0 to optimized height.
  let runningTop = baseline;
  const bars = [];

  // 1. Baseline
  bars.push({
    key: "baseline",
    label: "Baseline Cost",
    x: xPos(0),
    y: PAD_TOP + yScale(baseline),
    h: chartH - yScale(baseline),
    cx: xPos(0) + barW / 2,
    fill: "rgba(148,163,184,0.25)",
    stroke: "rgba(148,163,184,0.5)",
    glow: null,
    palette: {
      accent: "#94a3b8",
      bg: "rgba(148,163,184,0.15)",
      border: "rgba(148,163,184,0.4)",
      text: "#94a3b8",
    },
    tooltipRows: [{ label: "Total Baseline", value: fmtCost(baseline) }],
    savingPct: null,
    isBaseline: true,
  });

  // 2. Vehicle savings (floating / hanging bars)
  vehicleSegments.forEach((seg, i) => {
    const saving = Math.max(0, seg.saving); // only show positive savings
    const floatTop = runningTop;
    const floatBottom = runningTop - saving;
    const barY = PAD_TOP + yScale(floatTop);
    const barH = yScale(floatBottom) - yScale(floatTop);

    bars.push({
      key: seg.id,
      label: seg.id,
      x: xPos(1 + i),
      y: barY,
      h: Math.max(barH, 2),
      cx: xPos(1 + i) + barW / 2,
      fill: seg.palette.bg,
      stroke: seg.palette.border,
      glow: seg.palette.glow,
      palette: seg.palette,
      tooltipRows: [
        { label: "Baseline", value: fmtCost(seg.baseline) },
        { label: "Optimized", value: fmtCost(seg.optimized) },
        { label: "Saving", value: fmtCost(saving), color: seg.palette.text },
      ],
      savingPct: seg.baseline > 0 ? (saving / seg.baseline) * 100 : null,
      isVehicle: true,
      // connector line coordinates
      connFromX: i === 0 ? xPos(0) + barW : xPos(i) + barW,
      connToX: xPos(1 + i),
      connY: PAD_TOP + yScale(floatTop),
    });

    runningTop = floatBottom;
  });

  // 3. Optimized final bar
  const lastIdx = totalCols - 1;
  bars.push({
    key: "optimized",
    label: "Optimized Cost",
    x: xPos(lastIdx),
    y: PAD_TOP + yScale(optimized),
    h: chartH - yScale(optimized),
    cx: xPos(lastIdx) + barW / 2,
    fill: "rgba(245,158,11,0.2)",
    stroke: "rgba(245,158,11,0.6)",
    glow: "rgba(245,158,11,0.2)",
    palette: {
      accent: "#f59e0b",
      bg: "rgba(245,158,11,0.18)",
      border: "rgba(245,158,11,0.5)",
      text: "#fbbf24",
    },
    tooltipRows: [
      { label: "Optimized Cost", value: fmtCost(optimized), color: "#fbbf24" },
      { label: "Savings", value: fmtCost(netSavings), color: "#34d399" },
      { label: "Savings %", value: fmtPct(savingsPct), color: "#34d399" },
    ],
    savingPct: null,
    isOptimized: true,
  });

  const hovBar = hovered ? bars.find((b) => b.key === hovered) : null;

  return (
    <div
      className="rounded-3xl border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm shadow-2xl overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-700/50 bg-slate-800/40">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #10b981, #0d9488)" }}>
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Savings Waterfall</h2>
            <p className="text-[11px] text-slate-500">
              How each vehicle contributes to total cost reduction
            </p>
          </div>
        </div>

        {/* KPI pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Net Savings
            </span>
            <span className="text-lg font-bold text-emerald-400">
              {fmtCost(animSavings)}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-700/60" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Savings %
            </span>
            <span className="text-lg font-bold text-emerald-400">
              {fmtPct(savingsPct)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Summary stat strip ── */}
      <div className="grid grid-cols-3 divide-x divide-slate-700/40 border-b border-slate-700/40">
        {[
          {
            label: "Baseline Cost",
            value: fmtCost(animBaseline),
            color: "#94a3b8",
          },
          {
            label: "Net Savings",
            value: fmtCost(animSavings),
            color: "#34d399",
          },
          {
            label: "Optimized Cost",
            value: fmtCost(animOptimized),
            color: "#fbbf24",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-6 py-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {label}
            </span>
            <span className="text-base font-bold" style={{ color }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div ref={containerRef} className="relative px-0 py-4 select-none">
        <svg
          width="100%"
          height={svgH}
          viewBox={`0 0 ${width} ${svgH}`}
          className="overflow-visible">
          {/* Y-axis grid lines + labels */}
          {yTicks.map((v) => {
            const y = PAD_TOP + yScale(v);
            return (
              <g key={v}>
                <line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={PAD_LEFT + chartW + GAP}
                  y2={y}
                  stroke="rgba(148,163,184,0.08)"
                  strokeWidth={1}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fill="rgba(148,163,184,0.4)">
                  {fmtCost(v)}
                </text>
              </g>
            );
          })}

          {/* Connector dashes between bars */}
          {bars
            .filter((b) => b.connFromX != null)
            .map((b) => (
              <line
                key={`conn-${b.key}`}
                x1={b.connFromX}
                y1={b.connY}
                x2={b.connToX}
                y2={b.connY}
                stroke="rgba(148,163,184,0.2)"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            ))}

          {/* Bars */}
          {bars.map((bar, bi) => {
            const isHov = hovered === bar.key;
            const rx = Math.min(6, barW / 4);
            return (
              <g key={bar.key}>
                {/* Glow */}
                {isHov && bar.glow && (
                  <rect
                    x={bar.x - 4}
                    y={bar.y - 4}
                    width={barW + 8}
                    height={bar.h + 8}
                    rx={rx + 2}
                    fill={bar.glow}
                    style={{ filter: "blur(8px)" }}
                  />
                )}

                {/* Main bar */}
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={barW}
                  height={Math.max(bar.h, 2)}
                  rx={rx}
                  fill={isHov ? bar.stroke : bar.fill}
                  stroke={bar.stroke}
                  strokeWidth={1.5}
                  style={{
                    cursor: "pointer",
                    transition: "fill 0.15s",
                    filter: isHov
                      ? `drop-shadow(0 0 8px ${bar.palette.accent})`
                      : "none",
                  }}
                  onMouseEnter={() => setHovered(bar.key)}
                  onMouseLeave={() => setHovered(null)}
                />

                {/* Top value label */}
                <text
                  x={bar.x + barW / 2}
                  y={bar.y - 6}
                  textAnchor="middle"
                  fontSize={barW > 40 ? 10 : 9}
                  fontWeight="700"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fill={isHov ? bar.palette.text : "rgba(148,163,184,0.55)"}
                  style={{ transition: "fill 0.15s" }}>
                  {bar.isVehicle
                    ? fmtCost(Math.max(0, vehicleSegments[bi - 1]?.saving ?? 0))
                    : bar.isBaseline
                      ? fmtCost(baseline)
                      : fmtCost(optimized)}
                </text>

                {/* Bottom x-axis label */}
                <text
                  x={bar.x + barW / 2}
                  y={PAD_TOP + chartH + 16}
                  textAnchor="middle"
                  fontSize={barW > 50 ? 11 : 10}
                  fontWeight="700"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fill={isHov ? bar.palette.text : "rgba(148,163,184,0.5)"}
                  style={{ transition: "fill 0.15s" }}>
                  {bar.label.length > 10
                    ? bar.label.slice(0, 9) + "…"
                    : bar.label}
                </text>

                {/* Savings % badge on vehicle bars */}
                {bar.isVehicle && bar.savingPct != null && bar.h > 22 && (
                  <text
                    x={bar.x + barW / 2}
                    y={bar.y + bar.h / 2 + 4}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight="800"
                    fontFamily="'Plus Jakarta Sans', sans-serif"
                    fill="rgba(255,255,255,0.7)">
                    -{fmtPct(bar.savingPct)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Net savings bracket */}
          {vehicleSegments.length > 0 &&
            (() => {
              const firstVehX = bars[1]?.x ?? 0;
              const lastVehX = bars[bars.length - 2]?.x + barW ?? 0;
              const bracketY = PAD_TOP + yScale(baseline) + 8;
              const bracketBot = PAD_TOP + yScale(baseline - netSavings) - 8;
              const midY = (bracketY + bracketBot) / 2;
              const bx = lastVehX + 12;
              return (
                <g>
                  <line
                    x1={bx}
                    y1={bracketY}
                    x2={bx + 4}
                    y2={bracketY}
                    stroke="rgba(52,211,153,0.5)"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={bx + 4}
                    y1={bracketY}
                    x2={bx + 4}
                    y2={bracketBot}
                    stroke="rgba(52,211,153,0.5)"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={bx}
                    y1={bracketBot}
                    x2={bx + 4}
                    y2={bracketBot}
                    stroke="rgba(52,211,153,0.5)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={bx + 8}
                    y={midY + 4}
                    fontSize={10}
                    fontWeight="700"
                    fontFamily="'Plus Jakarta Sans', sans-serif"
                    fill="#34d399">
                    {fmtCost(netSavings)} saved
                  </text>
                </g>
              );
            })()}
        </svg>

        {/* Floating tooltip */}
        {hovBar && <WfTooltip bar={hovBar} containerWidth={width} />}
      </div>

      {/* ── Legend ── */}
      <div className="px-6 py-4 border-t border-slate-700/40 flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{
              background: "rgba(148,163,184,0.25)",
              border: "1px solid rgba(148,163,184,0.5)",
            }}
          />
          <span className="text-[11px] text-slate-500">Baseline cost</span>
        </div>
        {vehicleSegments.map((seg, i) => (
          <div key={seg.id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{
                background: seg.palette.bg,
                border: `1px solid ${seg.palette.border}`,
              }}
            />
            <span className="text-[11px] text-slate-500">{seg.id} saving</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{
              background: "rgba(245,158,11,0.2)",
              border: "1px solid rgba(245,158,11,0.6)",
            }}
          />
          <span className="text-[11px] text-slate-500">Optimized cost</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div
            className="w-3 h-[1px]"
            style={{
              background: "rgba(148,163,184,0.3)",
              borderTop: "1px dashed rgba(148,163,184,0.4)",
            }}
          />
          <span className="text-[11px] text-slate-500">
            Running total connector
          </span>
        </div>
      </div>
    </div>
  );
}
