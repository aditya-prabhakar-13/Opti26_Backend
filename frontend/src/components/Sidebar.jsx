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
        borderLeft: isActive
          ? "2px solid var(--color-accent)"
          : "2px solid transparent",
        background: isActive ? "var(--color-accent-soft)" : "transparent",
      }}
      onClick={() => onOpen(result.id)}
      onMouseEnter={(e) => {
        if (!isActive)
          e.currentTarget.style.background = "var(--color-paper-3)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}>
      <p
        className="flex-1 min-w-0 truncate text-[13px] tracking-wide"
        style={{
          color: isActive ? "var(--color-accent-text)" : "var(--color-ink-2)",
          fontWeight: isActive ? 600 : 400,
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
        style={{ color: "var(--color-faint)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--color-red)";
          e.currentTarget.style.background = "var(--color-red-soft)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--color-faint)";
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
        fontFamily: "var(--font-body)",
        background: "var(--color-paper-2)",
        borderRight: "1px solid var(--color-rule)",
      }}>
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-6 pt-7 pb-8">
        <img src="/favicon.svg" alt="" className="h-7 w-7 object-contain" />
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="text-[20px] font-semibold leading-none tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--color-ink)",
            }}>
            Velora
          </span>
          <span
            className="w-px h-4 flex-shrink-0"
            style={{ background: "var(--color-rule-2)" }}
          />
          <span
            className="text-[9px] font-semibold uppercase leading-tight whitespace-nowrap"
            style={{
              color: "var(--color-muted)",
              letterSpacing: "0.12em",
              fontFamily: "var(--font-body)",
            }}>
            Fleet<br />Intelligence
          </span>
        </div>
      </div>

      {/* ── TEST CASES section header ── */}
      <div
        className="px-6 pb-3 flex items-center justify-between"
        style={{
          color: "var(--color-muted)",
        }}>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ fontFamily: "var(--font-body)" }}>
          Test Cases
        </span>
        <button
          type="button"
          onClick={onNewCase}
          title="New test case"
          className="w-5 h-5 rounded flex items-center justify-center transition-colors"
          style={{ color: "var(--color-muted)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--color-accent-text)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--color-muted)")
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
              style={{ color: "var(--color-faint)" }}>
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

        {/* Delete All — styled as a row item */}
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
              color: "var(--color-muted)",
              borderLeft: "2px solid transparent",
              fontSize: "13px",
              fontWeight: 400,
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-paper-3)";
              e.currentTarget.style.color = "var(--color-red)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-muted)";
            }}>
            Delete All
          </button>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className="px-6 py-4"
        style={{
          borderTop: "1px solid var(--color-rule)",
        }}>
        <p
          className="text-[10px] font-medium tracking-wide"
          style={{ color: "var(--color-faint)" }}>
          © 2025 Velora Fleet Intelligence
        </p>
      </div>
    </aside>
  );
}
