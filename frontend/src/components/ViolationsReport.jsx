import React, { useState } from 'react';

export default function ViolationsReport({ evaluations, mapMode }) {
    const [expandedRow, setExpandedRow] = useState(null);

    if (!evaluations) return null;

    const evaluationData = evaluations[mapMode];
    if (!evaluationData) return null;

    const { stats, violations } = evaluationData;

    return (
        <div
            className="mt-4 rounded-md overflow-hidden"
            style={{
                background: "var(--color-paper-2)",
                border: "1px solid var(--color-rule)",
                boxShadow: "var(--shadow-sm)",
            }}>
            {/* Header */}
            <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--color-rule)", background: "var(--color-paper)" }}>
                <h3 className="text-sm font-semibold tracking-wide" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>
                    Constraint Violations ({mapMode})
                </h3>
                <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-red)" }}></span>
                        <span style={{ color: "var(--color-ink-2)" }}>Hard: {stats?.hard_violations || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-amber)" }}></span>
                        <span style={{ color: "var(--color-ink-2)" }}>Soft: {stats?.soft_violations || 0}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-128">
                <table className="w-full text-left" style={{ tableLayout: 'fixed', minWidth: '600px' }}>
                    <colgroup>
                        {[
                            '88px',
                            '176px',
                            '108px',
                            '100px',
                            null,
                        ].map((width, idx) => (
                            <col key={idx} style={width ? { width } : undefined} />
                        ))}
                    </colgroup>
                    <thead className="sticky top-0 z-10 backdrop-blur-sm" style={{ background: "var(--color-paper-3)" }}>
                        <tr>
                            {['Severity', 'Constraint', 'Employee', 'Vehicle', 'Detail'].map(col => (
                                <th key={col} className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap" style={{ color: "var(--color-muted)", borderBottom: "1px solid var(--color-rule)" }}>
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody style={{ borderColor: "var(--color-rule)" }} className="[&>tr]:border-t [&>tr]:border-[var(--color-rule)]">
                        {violations && violations.length > 0 ? (
                            violations.map((v, i) => {
                                const isExpanded = expandedRow === i;
                                const isLong = v.detail && v.detail.length > 100;
                                return (
                                    <tr key={i} className="transition-colors align-top hover:[background:var(--color-paper-3)]">
                                        {/* Severity */}
                                        <td className="px-4 py-2.5 text-xs">
                                            <span
                                                className="px-2 py-0.5 rounded-md font-medium"
                                                style={v.severity === 'HARD'
                                                    ? { background: "var(--color-red-soft)", color: "var(--color-red)", border: "1px solid var(--color-red)" }
                                                    : { background: "var(--color-amber-soft)", color: "var(--color-accent-text)", border: "1px solid var(--color-amber)" }
                                                }>
                                                {v.severity}
                                            </span>
                                        </td>

                                        {/* Constraint */}
                                        <td className="px-4 py-2.5 text-xs break-words" style={{ color: "var(--color-ink-2)" }}>
                                            {v.constraint_name}
                                        </td>

                                        {/* Employee */}
                                        <td className="px-4 py-2.5 text-xs font-medium" style={{ color: "var(--color-ink-2)", fontFamily: "var(--font-mono)" }}>
                                            {v.employee_id || <span style={{ color: "var(--color-faint)" }}>—</span>}
                                        </td>

                                        {/* Vehicle */}
                                        <td className="px-4 py-2.5 text-xs font-medium" style={{ color: "var(--color-ink-2)", fontFamily: "var(--font-mono)" }}>
                                            {v.vehicle_id || <span style={{ color: "var(--color-faint)" }}>—</span>}
                                        </td>

                                        {/* Detail — wraps fully, clamp + expand for very long entries */}
                                        <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-muted)" }}>
                                            <div style={
                                                isLong && !isExpanded
                                                    ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }
                                                    : { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
                                            }>
                                                {v.detail}
                                            </div>
                                            {isLong && (
                                                <button
                                                    onClick={() => setExpandedRow(isExpanded ? null : i)}
                                                    className="mt-1 text-xs transition-colors hover:[color:var(--color-ink)]"
                                                    style={{ color: "var(--color-accent-text)" }}
                                                >
                                                    {isExpanded ? '▲ less' : '▼ more'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>
                                    No violations recorded for this mode.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
