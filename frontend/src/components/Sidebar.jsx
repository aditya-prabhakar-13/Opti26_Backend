/* ── Icons ── */
function IconPlus() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

/* ── Test Case Row ── */
function TestCaseRow({ result, isActive, isDeleting, onOpen, onDelete }) {
  return (
    <div
      onClick={() => onOpen(result.id)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "7px 8px 7px 12px",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "background 100ms ease",
        background: isActive ? "rgba(37,99,235,0.1)" : "transparent",
      }}
      onMouseEnter={e => {
        if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      }}
      onMouseLeave={e => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Active left indicator */}
      {isActive && (
        <div style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: "2px",
          height: "18px",
          borderRadius: "0 2px 2px 0",
          background: "var(--color-accent)",
        }} />
      )}

      {/* Icon square */}
      <div style={{
        flexShrink: 0,
        width: "26px",
        height: "26px",
        borderRadius: "5px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isActive ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.05)",
        color: isActive ? "#60a5fa" : "var(--color-text-3)",
        transition: "background 100ms ease, color 100ms ease",
      }}>
        <IconMap />
      </div>

      {/* Label + date */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontSize: "0.75rem",
          fontWeight: 500,
          color: isActive ? "var(--color-text)" : "var(--color-text-2)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.4,
          transition: "color 100ms ease",
        }}>
          {result.filename ?? `Case #${result.id}`}
        </p>
        {result.createdAt && (
          <p style={{
            margin: 0,
            fontSize: "0.6875rem",
            color: "var(--color-text-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
            marginTop: "1px",
          }}>
            {result.createdAt}
          </p>
        )}
      </div>

      {/* Delete button (shown on parent hover via CSS class on wrapper) */}
      <button
        type="button"
        className="row-delete"
        disabled={isDeleting}
        onClick={e => { e.stopPropagation(); onDelete(result.id); }}
        title="Delete"
        style={{
          flexShrink: 0,
          width: "22px",
          height: "22px",
          borderRadius: "4px",
          border: "none",
          background: "transparent",
          color: "var(--color-text-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          opacity: 0,
          transition: "opacity 100ms ease, color 100ms ease, background 100ms ease",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = "var(--color-red)";
          e.currentTarget.style.background = "var(--color-red-muted)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = "var(--color-text-3)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        {isDeleting
          ? <div style={{ width: 10, height: 10, border: "1.5px solid var(--color-text-3)", borderTopColor: "var(--color-text-2)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          : <IconTrash />
        }
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
    <aside style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--color-surface)",
      borderRight: "1px solid var(--color-border)",
      fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
    }}>

      {/* ── Brand ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "16px",
        borderBottom: "1px solid var(--color-border)",
        flexShrink: 0,
      }}>
        <img src="/favicon.svg" alt="Velora" style={{ height: "24px", width: "24px", flexShrink: 0 }} />
        <div>
          <p style={{
            margin: 0,
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--color-text)",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}>
            Velora
          </p>
          <p style={{
            margin: 0,
            fontSize: "0.6875rem",
            fontWeight: 400,
            color: "var(--color-text-3)",
            lineHeight: 1.2,
          }}>
            Fleet Intelligence
          </p>
        </div>
      </div>

      {/* ── New Case button ── */}
      <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={onNewCase}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "7px 12px",
            borderRadius: "6px",
            background: "var(--color-accent)",
            border: "none",
            color: "#fff",
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            cursor: "pointer",
            transition: "background 120ms ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--color-accent-h)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--color-accent)"; }}
        >
          <IconPlus />
          New Test Case
        </button>
      </div>

      {/* ── Section header ── */}
      <div style={{ padding: "10px 14px 4px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "0.625rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-text-3)",
          }}>
            Test Cases
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
          {results.length > 0 && (
            <span style={{
              fontSize: "0.625rem",
              fontWeight: 700,
              color: "var(--color-text-3)",
              background: "var(--color-border)",
              borderRadius: "999px",
              padding: "1px 5px",
              lineHeight: 1.6,
            }}>
              {results.length}
            </span>
          )}
        </div>
      </div>

      {/* ── Case list ── */}
      <div
        className="sidebar-list"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 8px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "1px",
        }}
      >
        {results.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "40px 16px",
            textAlign: "center",
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-3)",
            }}>
              <IconMap />
            </div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-3)", lineHeight: 1.5 }}>
              No test cases yet.<br />Run your first optimization.
            </p>
          </div>
        ) : (
          results.map(result => (
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
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: "1px solid var(--color-border)",
        padding: "10px 12px",
        flexShrink: 0,
      }}>
        {results.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete all test cases? This cannot be undone.")) {
                onDeleteAllTestCases?.();
              }
            }}
            style={{
              width: "100%",
              fontSize: "0.75rem",
              fontWeight: 500,
              padding: "6px 8px",
              borderRadius: "5px",
              border: "none",
              background: "transparent",
              color: "var(--color-text-3)",
              cursor: "pointer",
              transition: "background 120ms ease, color 120ms ease",
              marginBottom: "8px",
              textAlign: "left",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "var(--color-red)";
              e.currentTarget.style.background = "var(--color-red-muted)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "var(--color-text-3)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Clear all test cases
          </button>
        )}
        <p style={{ margin: 0, fontSize: "0.625rem", color: "var(--color-text-3)", fontWeight: 400 }}>
          © 2025 Velora Fleet Intelligence
        </p>
      </div>
    </aside>
  );
}
