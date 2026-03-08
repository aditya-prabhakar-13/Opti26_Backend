import { useState } from "react";

function IconUpload({ size = 20 }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function IconFile({ size = 18 }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function IconSpinner({ size = 14 }) {
  return (
    <svg width={size} height={size} className="animate-spin" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.2 }} />
      <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" style={{ opacity: 0.8 }} />
    </svg>
  );
}

function IconCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function IconRoute({ size = 18 }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

/* ── Step dot ── */
function Step({ number, label, active, done }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
      <div style={{
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.6875rem",
        fontWeight: 700,
        flexShrink: 0,
        transition: "all 200ms ease",
        background: done
          ? "var(--color-green)"
          : active
            ? "var(--color-accent)"
            : "var(--color-surface-2)",
        border: `1px solid ${done
          ? "var(--color-green)"
          : active
            ? "var(--color-accent)"
            : "var(--color-border-2)"}`,
        color: done || active ? "#fff" : "var(--color-text-3)",
      }}>
        {done ? <IconCheck size={10} /> : number}
      </div>
      <span style={{
        fontSize: "0.75rem",
        fontWeight: done ? 600 : active ? 600 : 400,
        color: done
          ? "var(--color-green)"
          : active
            ? "var(--color-text)"
            : "var(--color-text-3)",
        whiteSpace: "nowrap",
        transition: "color 200ms ease",
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
  const [optimizationMode, setOptimizationMode] = useState("instant");
  const [isDragOver, setIsDragOver] = useState(false);

  const step = selectedFile ? 2 : 1;

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileChange(file);
  };

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 16px",
      background: "var(--color-bg)",
      fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          {/* Icon — simple, not gradient */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-2)",
            color: "var(--color-accent)",
            marginBottom: "20px",
          }}>
            <IconRoute size={22} />
          </div>

          <h1 style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--color-text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            margin: "0 0 8px",
          }}>
            {hasCases ? "New Test Case" : "Welcome to Velora"}
          </h1>
          <p style={{
            fontSize: "0.875rem",
            color: "var(--color-text-2)",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: "360px",
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            {hasCases
              ? "Upload a new Excel dataset to generate optimized fleet routes."
              : "Upload your Excel data to generate explainable, optimized commute routes for your fleet."}
          </p>
        </div>

        {/* ── Steps ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px", padding: "0 4px" }}>
          <Step number={1} label="Upload file" active={step === 1} done={step > 1} />
          <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
          <Step number={2} label="Run optimization" active={step === 2} done={false} />
          <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
          <Step number={3} label="View results" active={false} done={false} />
        </div>

        {/* ── Card ── */}
        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
        }}>
          {/* Upload zone */}
          <label
            htmlFor="upload-input"
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "32px 24px",
              cursor: "pointer",
              borderBottom: "1px solid var(--color-border)",
              background: selectedFile
                ? "rgba(34,197,94,0.04)"
                : isDragOver
                  ? "var(--color-accent-muted)"
                  : "transparent",
              transition: "background 120ms ease",
              position: "relative",
            }}
          >
            <input
              id="upload-input"
              type="file"
              accept=".xlsx,.json"
              style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
              onChange={e => onFileChange(e.target.files?.[0] || null)}
            />

            {/* Icon */}
            <div style={{
              width: "52px",
              height: "52px",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px dashed ${selectedFile ? "var(--color-green)" : isDragOver ? "var(--color-accent)" : "var(--color-border-2)"}`,
              color: selectedFile ? "var(--color-green)" : isDragOver ? "var(--color-accent)" : "var(--color-text-3)",
              background: selectedFile ? "var(--color-green-muted)" : isDragOver ? "var(--color-accent-muted)" : "var(--color-surface-2)",
              transition: "all 120ms ease",
            }}>
              {selectedFile ? <IconFile size={20} /> : <IconUpload size={20} />}
            </div>

            {selectedFile ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", marginBottom: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-green)", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-green)" }}>File ready</span>
                </div>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)", margin: "0 0 2px" }}>
                  {selectedFile.name}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-3)", margin: 0 }}>Click to replace</p>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
                  Drop your file here, or <span style={{ color: "var(--color-accent)" }}>browse</span>
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-3)", margin: 0 }}>
                  Supported: .xlsx, .json
                </p>
              </div>
            )}
          </label>

          {/* Actions */}
          <div style={{ padding: "20px" }}>
            {/* Optimization mode (Excel only) */}
            {selectedFile && !selectedFile.name.endsWith(".json") && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--color-text-3)",
                  textAlign: "center",
                  marginBottom: "10px",
                }}>
                  Optimization Mode
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  {[
                    { id: '0', label: 'Instant Optimize' },
                    { id: '1', label: 'Deep Optimize' },
                    // { id: 'deep', label: 'Deep' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      disabled={loading}
                      onClick={() => setOptimizationMode(mode.id)}
                      className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${optimizationMode === mode.id
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

            {/* CTA button */}
            <button
              type="button"
              disabled={loading || !selectedFile}
              onClick={() => onRunOptimization(optimizationMode)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "var(--radius-lg)",
                border: "none",
                background: loading || !selectedFile ? "var(--color-surface-2)" : "var(--color-accent)",
                color: loading || !selectedFile ? "var(--color-text-3)" : "#fff",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: loading || !selectedFile ? "not-allowed" : "pointer",
                transition: "background 120ms ease",
              }}
              onMouseEnter={e => {
                if (!loading && selectedFile) e.currentTarget.style.background = "var(--color-accent-h)";
              }}
              onMouseLeave={e => {
                if (!loading && selectedFile) e.currentTarget.style.background = "var(--color-accent)";
              }}
            >
              {loading ? (
                <><IconSpinner size={14} />{selectedFile?.name.endsWith(".json") ? "Loading…" : "Running optimization…"}</>
              ) : (
                <>{selectedFile?.name.endsWith(".json") ? <IconCheck size={14} /> : <IconRoute size={14} />}
                  {selectedFile?.name.endsWith(".json") ? "Load Test Case" : "Run Optimization"}</>
              )}
            </button>

            {!selectedFile && (
              <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: "10px" }}>
                Upload an Excel file to continue
              </p>
            )}
          </div>
        </div>

        {!hasCases && (
          <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: "16px" }}>
            Your results will appear in the sidebar after optimization completes.
          </p>
        )}
      </div>
    </section>
  );
}
