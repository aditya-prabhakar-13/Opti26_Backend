/* ── Google Fonts (injected once) ── */
if (typeof document !== "undefined" && !document.getElementById("db-fonts")) {
  const link = document.createElement("link");
  link.id = "db-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,400&display=swap";
  document.head.appendChild(link);
}

/* ── Icons ── */
function IconPlus() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function IconRoute() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

/* ── Test Case Row ── */
function TestCaseRow({ result, isActive, isDeleting, onOpen, onDelete }) {
  return (
    <div
      className={`
        group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer
        transition-all duration-200
        ${
          isActive
            ? "bg-amber-500/15 border border-amber-500/30"
            : "hover:bg-slate-700/50 border border-transparent hover:border-slate-600/40"
        }
      `}
      onClick={() => onOpen(result.id)}>
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-400" />
      )}

      {/* Icon */}
      <div
        className={`
        flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
        ${isActive ? "bg-amber-500/20 text-amber-400" : "bg-slate-700/80 text-slate-400 group-hover:bg-slate-600/80"}
        transition-colors duration-200
      `}>
        <IconRoute />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-semibold truncate leading-tight ${isActive ? "text-amber-300" : "text-slate-300 group-hover:text-white"} transition-colors`}>
          {result.name ?? `Case #${result.id}`}
        </p>
        {result.createdAt && (
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            {result.createdAt}
          </p>
        )}
      </div>

      {/* Delete button */}
      <button
        type="button"
        disabled={isDeleting}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(result.id);
        }}
        className="
          flex-shrink-0 opacity-0 group-hover:opacity-100
          w-6 h-6 rounded-lg flex items-center justify-center
          text-slate-500 hover:text-rose-400 hover:bg-rose-400/10
          transition-all duration-150
          disabled:opacity-30
        "
        title="Delete">
        {isDeleting ? (
          <div className="w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />
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
        background: "linear-gradient(180deg, #0f1623 0%, #111827 100%)",
        borderRight: "1px solid rgba(148,163,184,0.08)",
      }}>
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-5 py-6">
        {/* <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/40 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}> */}
        <img src="/favicon.svg" alt="" className="h-8" />
        {/* </div> */}
        <div>
          <p
            className="text-base font-bold text-white leading-none tracking-wide"
            style={{ fontFamily: "'Fraunces', serif" }}>
            VELORA
          </p>
          <p className="text-[10px] text-amber-500/80 font-semibold tracking-widest uppercase mt-0.5">
            Driven by Possibility
          </p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />

      {/* ── New Test Case button ── */}
      <div className="px-4 py-4">
        <button
          type="button"
          onClick={onNewCase}
          className="
            w-full flex items-center justify-center gap-2.5
            px-4 py-2.5 rounded-xl
            font-bold text-sm text-white
            transition-all duration-200
            hover:-translate-y-0.5
            shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50
            cursor-pointer
          "
          style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}>
          <IconPlus />
          New Test Case
        </button>
      </div>

      {/* ── Test Cases list ── */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 px-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Test Cases
          </span>
          <div className="flex-1 h-px bg-slate-700/50" />
          {results.length > 0 && (
            <span className="text-[10px] font-bold text-slate-600 bg-slate-800 rounded-full px-1.5 py-0.5">
              {results.length}
            </span>
          )}
        </div>
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
            className="
              w-full text-[10px] font-semibold
              px-2 py-1.5 rounded-lg mt-1
              text-rose-400 hover:bg-rose-500/10
              transition-colors duration-200
            "
            title="Delete all test cases">
            Delete All
          </button>
        )}
      </div>

      {/* ── Scrollable case list ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 scrollbar-thin">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-600">
              <IconRoute />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              No test cases yet.
              <br />
              Run your first optimization above.
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
      </div>

      {/* ── Footer ── */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
      <div className="px-5 py-4">
        <p className="text-[10px] text-slate-600 font-semibold tracking-wide">
          © 2025 Velora Fleet Intelligence
        </p>
      </div>
    </aside>
  );
}
