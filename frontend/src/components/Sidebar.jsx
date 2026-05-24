/* ── Icons ── */
function IconTrash() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

/* ── Test Case Row ── */
function TestCaseRow({ result, isActive, isDeleting, onOpen, onDelete }) {
  return (
    <div
      className="group relative flex items-center gap-2 pl-6 pr-3 py-2.5 cursor-pointer transition-colors duration-150"
      style={{
        borderLeft: isActive ? "2px solid #c9a047" : "2px solid transparent",
        background: isActive ? "rgba(201,160,71,0.04)" : "transparent",
      }}
      onClick={() => onOpen(result.id)}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.025)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}>
      <p
        className="flex-1 min-w-0 truncate text-[13px] tracking-wide"
        style={{
          color: isActive ? "#f5f5f5" : "rgba(255,255,255,0.55)",
          fontWeight: isActive ? 500 : 400,
        }}
        title={result.filename ?? `Case #${result.id}`}>
        {result.filename ?? `Case #${result.id}`}
      </p>

      <button
        type="button"
        disabled={isDeleting}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(result.id);
        }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center transition-all duration-150 disabled:opacity-30"
        style={{ color: "rgba(255,255,255,0.4)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#c9a047";
          e.currentTarget.style.background = "rgba(201,160,71,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(255,255,255,0.4)";
          e.currentTarget.style.background = "transparent";
        }}
        title="Delete">
        {isDeleting ? (
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <IconTrash />
        )}
      </button>
    </div>
  );
}

/* ── Sidebar ── */
export default function Sidebar({
  results = [],
  selectedResult,
  deletingId,
  onNewCase,
  onOpenResult,
  onDeleteResult,
  onDeleteAllTestCases,
}) {
  const selectedId = selectedResult?.id;

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: "#0a0b0e",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}>
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-6 pt-7 pb-8">
        <img src="/favicon.svg" alt="" className="h-7 w-7 object-contain" />
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="text-[20px] font-semibold leading-none text-white tracking-wide"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
            Velora
          </span>
          <span
            className="w-px h-4 flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.18)" }}
          />
          <span
            className="text-[9px] font-semibold uppercase leading-tight whitespace-nowrap"
            style={{
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.12em",
              fontFamily: "'Inter', sans-serif",
            }}>
            Fleet<br />Intelligence
          </span>
        </div>
      </div>

      {/* ── TEST CASES section header ── */}
      <div
        className="px-6 pb-3 flex items-center justify-between"
        style={{
          color: "rgba(255,255,255,0.42)",
        }}>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ fontFamily: "'Inter', sans-serif" }}>
          Test Cases
        </span>
        <button
          type="button"
          onClick={onNewCase}
          title="New test case"
          className="w-5 h-5 rounded flex items-center justify-center transition-colors"
          style={{ color: "rgba(255,255,255,0.45)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#c9a047")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.45)")
          }>
          <IconPlus />
        </button>
      </div>

      {/* ── Case list ── */}
      <div className="flex-1 overflow-y-auto pb-2 scrollbar-thin">
        {results.length === 0 ? (
          <div className="px-6 py-6">
            <p
              className="text-[11px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.35)" }}>
              No test cases yet.
            </p>
          </div>
        ) : (
          results.map((result) => (
            <TestCaseRow
              key={result.id}
              result={result}
              isActive={result.id === selectedId}
              isDeleting={deletingId === result.id}
              onOpen={onOpenResult}
              onDelete={onDeleteResult}
            />
          ))
        )}

        {/* Delete All — styled as a row item, matching Image 1 */}
        {results.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Delete all test cases? This action cannot be undone."
                )
              ) {
                onDeleteAllTestCases?.();
              }
            }}
            className="w-full text-left pl-6 pr-3 py-2.5 transition-colors duration-150"
            style={{
              color: "rgba(255,255,255,0.45)",
              borderLeft: "2px solid transparent",
              fontSize: "13px",
              fontWeight: 400,
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.025)";
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.45)";
            }}>
            Delete All
          </button>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className="px-6 py-4"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}>
        <p
          className="text-[10px] font-medium tracking-wide"
          style={{ color: "rgba(255,255,255,0.25)" }}>
          © 2025 Velora Fleet Intelligence
        </p>
      </div>
    </aside>
  );
}
