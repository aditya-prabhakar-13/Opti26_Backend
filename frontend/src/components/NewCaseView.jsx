
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
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
        style={
          done
            ? { background: "var(--color-green)", color: "var(--color-paper)" }
            : active
              ? { background: "var(--color-accent)", color: "var(--color-accent-ink)" }
              : {
                  background: "var(--color-paper-3)",
                  border: "1px solid var(--color-rule-2)",
                  color: "var(--color-muted)",
                }
        }>
        {done ? <IconCheck /> : number}
      </div>
      <span
        className="text-xs font-semibold"
        style={{
          color: active
            ? "var(--color-ink)"
            : done
              ? "var(--color-green)"
              : "var(--color-muted)",
        }}>
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
  const [optimizationMode, setOptimizationMode] = useState("0");
  const step = selectedFile ? (loading ? 2 : 2) : 1;
  const isDone = !loading && selectedFile;

  return (
    <section
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        fontFamily: "var(--font-body)",
        background: "var(--color-bg)",
      }}>

      <div className="relative z-10 w-full max-w-lg">
        {/* ── Header ── */}
        <div className="text-center mb-10 flex flex-col items-center gap-4">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-lg mb-5 flex-shrink-0"
            style={{ background: "var(--color-accent)", color: "var(--color-accent-ink)" }}>
            <IconRoute />
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
            {hasCases ? "New Test Case" : "Welcome to Velora"}
          </h1>
          <p
            className="text-sm leading-relaxed max-w-sm mx-auto"
            style={{ color: "var(--color-ink-2)" }}>
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
          <div className="flex-1 h-px mx-1" style={{ background: "var(--color-rule-2)" }} />
          <Step
            number={2}
            label="Run optimization"
            active={step === 2}
            done={false}
          />
          <div className="flex-1 h-px mx-1" style={{ background: "var(--color-rule-2)" }} />
          <Step number={3} label="View results" active={false} done={false} />
        </div>

        {/* ── Card ── */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            border: "1px solid var(--color-rule)",
            background: "var(--color-paper-2)",
            boxShadow: "var(--shadow-md)",
          }}>
          {/* Upload zone */}
          <label
            htmlFor="upload-input"
            className="relative flex flex-col items-center justify-center gap-4 px-8 py-10 cursor-pointer transition-all duration-200 group"
            style={{
              borderBottom: "1px solid var(--color-rule)",
              background: selectedFile
                ? "var(--color-green-soft)"
                : "var(--color-paper-3)",
            }}>
            <input
              id="upload-input"
              type="file"
              accept=".xlsx,.json"
              className="sr-only"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />

            {/* Icon circle */}
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center transition-all duration-200"
              style={
                selectedFile
                  ? { background: "var(--color-green-soft)", color: "var(--color-green)" }
                  : { background: "var(--color-paper-3)", color: "var(--color-muted)" }
              }>
              {selectedFile ? <IconFile /> : <IconUpload />}
            </div>

            {selectedFile ? (
              <div className="text-center">
                <div className="flex items-center gap-2 justify-center mb-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-green)" }} />
                  <p className="text-sm font-bold" style={{ color: "var(--color-green)" }}>
                    File ready
                  </p>
                </div>
                <p className="font-semibold text-sm" style={{ color: "var(--color-ink)" }}>
                  {selectedFile.name}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>Click to replace</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="font-semibold text-sm mb-1" style={{ color: "var(--color-ink)" }}>
                  Drop your file here, or{" "}
                  <span style={{ color: "var(--color-accent-text)" }}>browse</span>
                </p>
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                  Supported formats: .xlsx, .json
                </p>
              </div>
            )}

            {/* Dashed border overlay */}
            {!selectedFile && (
              <div
                className="absolute inset-4 rounded-lg border-2 border-dashed transition-colors duration-200 pointer-events-none group-hover:[border-color:var(--color-accent)]"
                style={{ borderColor: "var(--color-rule-2)" }}
              />
            )}
          </label>

          {/* Action area */}
          <div className="px-8 py-6 space-y-4">

            {/* Optimization Mode Select */}
            {selectedFile && !selectedFile.name.endsWith('.json') && (
              <div className="flex flex-col gap-3 mb-6">
                <label className="text-xs font-bold uppercase tracking-widest text-center" style={{ color: "var(--color-muted)" }}>Optimization Mode</label>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {[
                    { id: '0', label: 'Balanced Optimize' },
                    { id: '1', label: 'Deep Optimize' },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      disabled={loading}
                      onClick={() => setOptimizationMode(mode.id)}
                      className="px-5 py-2 rounded-md text-xs font-bold tracking-wide transition-all"
                      style={optimizationMode === mode.id
                        ? { background: "var(--color-accent-soft)", color: "var(--color-accent-text)", border: "1px solid var(--color-accent)" }
                        : { background: "var(--color-paper-2)", color: "var(--color-muted)", border: "1px solid var(--color-rule-2)" }
                      }
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
                font-bold text-sm
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                hover:-translate-y-0.5
              "
              style={
                !loading && selectedFile
                  ? { background: "var(--color-accent)", color: "var(--color-accent-ink)", boxShadow: "var(--shadow-md)" }
                  : { background: "var(--color-paper-3)", color: "var(--color-muted)", boxShadow: "none" }
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
              <p className="text-center text-xs" style={{ color: "var(--color-muted)" }}>
                Upload an Excel file to continue
              </p>
            )}
          </div>
        </div>

        {/* ── Footer hint ── */}
        {!hasCases && (
          <p className="text-center text-xs mt-6" style={{ color: "var(--color-muted)" }}>
            Your results will appear in the sidebar after optimization
            completes.
          </p>
        )}
      </div>
    </section>
  );
}
