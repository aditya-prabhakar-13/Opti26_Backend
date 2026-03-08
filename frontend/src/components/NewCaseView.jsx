/* ── Google Fonts (injected once) ── */
if (typeof document !== "undefined" && !document.getElementById("db-fonts")) {
  const link = document.createElement("link");
  link.id = "db-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,400&display=swap";
  document.head.appendChild(link);
}

import { useState } from "react";

function IconUpload() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function IconFile() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function IconRoute() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  );
}

/* ── Step indicator ── */
function Step({ number, label, active, done }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`
        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
        ${done ? "text-white shadow-sm shadow-emerald-900/40" : active ? "text-slate-900 shadow-sm shadow-amber-900/40" : "bg-slate-800 border border-slate-700 text-slate-500"}
      `}
        style={
          done
            ? { background: "var(--color-green)" }
            : active
              ? { background: "var(--color-accent)" }
              : {}
        }>
        {done ? <IconCheck /> : number}
      </div>
      <span
        className={`text-xs font-semibold ${active ? "text-white" : done ? "text-emerald-400" : "text-slate-500"}`}>
        {label}
      </span>
    </div>
  );
}

/* ── Main ── */
export default function NewCaseView({
  hasCases,
  selectedFile,
  loading,
  onFileChange,
  onRunOptimization,
}) {
  const [optimizationMode, setOptimizationMode] = useState("instant");
  const step = selectedFile ? (loading ? 2 : 2) : 1;
  const isDone = !loading && selectedFile;

  return (
    <section
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: "var(--color-bg)",
      }}>

      <div className="relative z-10 w-full max-w-lg">
        {/* ── Header ── */}
        <div className="text-center mb-10 flex flex-col items-center gap-4">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-lg mb-5 flex-shrink-0"
            style={{ background: "var(--color-accent)" }}>
            <IconRoute />
          </div>
          <h1
            className="text-3xl font-bold text-white mb-2"
            style={{ fontFamily: "'Fraunces', serif" }}>
            {hasCases ? "New Test Case" : "Welcome to Velora"}
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            {hasCases
              ? "Upload a new Excel dataset to generate and compare optimized fleet routes."
              : "Upload your Excel data to generate explainable, optimized commute routes for your fleet."}
          </p>
        </div>

        {/* ── Steps ── */}
        <div className="flex items-center gap-2 mb-8 px-1">
          <Step
            number={1}
            label="Upload file"
            active={step === 1}
            done={step > 1}
          />
          <div className="flex-1 h-px bg-slate-700/60 mx-1" />
          <Step
            number={2}
            label="Run optimization"
            active={step === 2}
            done={false}
          />
          <div className="flex-1 h-px bg-slate-700/60 mx-1" />
          <Step number={3} label="View results" active={false} done={false} />
        </div>

        {/* ── Card ── */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
          {/* Upload zone */}
          <label
            htmlFor="upload-input"
            className={`
              relative flex flex-col items-center justify-center gap-4
              px-8 py-10 cursor-pointer border-b border-slate-700/50
              transition-all duration-200 group
              ${selectedFile
                ? "bg-emerald-500/5 hover:bg-emerald-500/8"
                : "bg-slate-800/20 hover:bg-slate-700/30"
              }
            `}>
            <input
              id="upload-input"
              type="file"
              accept=".xlsx,.json"
              className="sr-only"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />

            {/* Icon circle */}
            <div
              className={`
              w-16 h-16 rounded-lg flex items-center justify-center transition-all duration-200
              ${selectedFile
                  ? "bg-emerald-500/15 text-emerald-400 shadow-lg shadow-emerald-900/20"
                  : "bg-slate-700/80 text-slate-400 group-hover:bg-amber-500/15 group-hover:text-amber-400 group-hover:shadow-lg group-hover:shadow-amber-900/20"
                }
            `}>
              {selectedFile ? <IconFile /> : <IconUpload />}
            </div>

            {selectedFile ? (
              <div className="text-center">
                <div className="flex items-center gap-2 justify-center mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <p className="text-sm font-bold text-emerald-400">
                    File ready
                  </p>
                </div>
                <p className="text-white font-semibold text-sm">
                  {selectedFile.name}
                </p>
                <p className="text-slate-500 text-xs mt-1">Click to replace</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-white font-semibold text-sm mb-1">
                  Drop your file here, or{" "}
                  <span className="text-amber-400">browse</span>
                </p>
                <p className="text-slate-500 text-xs">
                  Supported formats: .xlsx, .json
                </p>
              </div>
            )}

            {/* Dashed border overlay */}
            {!selectedFile && (
              <div className="absolute inset-4 rounded-lg border-2 border-dashed border-slate-600/50 group-hover:border-amber-500/30 transition-colors duration-200 pointer-events-none" />
            )}
          </label>

          {/* Action area */}
          <div className="px-8 py-6 space-y-4">

            {/* Optimization Mode Select */}
            {selectedFile && !selectedFile.name.endsWith('.json') && (
              <div className="flex flex-col gap-3 mb-6">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 text-center">Optimization Mode</label>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {[
                    { id: 'instant', label: 'Instant' },
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'deep', label: 'Deep' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      disabled={loading}
                      onClick={() => setOptimizationMode(mode.id)}
                      className={`px-5 py-2 rounded-md text-xs font-bold tracking-wide transition-all ${optimizationMode === mode.id
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/50 shadow-sm shadow-amber-900/20'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/60 hover:bg-slate-700/50 hover:text-slate-200'
                        }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={loading || !selectedFile}
              onClick={() => onRunOptimization(optimizationMode)}
              className="
                w-full flex items-center justify-center gap-3
                px-6 py-3.5 rounded-lg
                font-bold text-sm text-white
                transition-all duration-200
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0
                hover:-translate-y-0.5
                shadow-lg shadow-amber-900/20 hover:shadow-amber-900/40
              "
              style={
                !loading && selectedFile
                  ? { background: "var(--color-accent)" }
                  : { background: "rgba(100,116,139,0.2)", boxShadow: "none" }
              }>
              {loading ? (
                <>
                  <IconSpinner />
                  {selectedFile?.name.endsWith('.json') ? 'Loading…' : 'Running optimization…'}
                </>
              ) : (
                <>
                  {selectedFile?.name.endsWith('.json') ? <IconCheck /> : <IconRoute />}
                  {selectedFile?.name.endsWith('.json') ? 'Load Test Case' : 'Run Optimization'}
                </>
              )}
            </button>

            {!selectedFile && (
              <p className="text-center text-xs text-slate-600">
                Upload an Excel file to continue
              </p>
            )}
          </div>
        </div>

        {/* ── Footer hint ── */}
        {!hasCases && (
          <p className="text-center text-xs text-slate-600 mt-6">
            Your results will appear in the sidebar after optimization
            completes.
          </p>
        )}
      </div>
    </section>
  );
}
