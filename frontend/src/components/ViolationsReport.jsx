import React, { useState } from 'react';

export default function ViolationsReport({ evaluations, mapMode }) {
    const [expandedRow, setExpandedRow] = useState(null);

    if (!evaluations) return null;

    const evaluationData = evaluations[mapMode];
    if (!evaluationData) return null;

    const { stats, violations } = evaluationData;

    return (
        <div className="mt-4 bg-[#0a0c10] border border-slate-700/60 rounded-md overflow-hidden shadow-lg">
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-700/60 flex items-center justify-between bg-[#0c0e12]">
                <h3 className="text-sm font-semibold text-white tracking-wide">
                    Constraint Violations ({mapMode})
                </h3>
                <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-slate-300">Hard: {stats?.hard_violations || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-slate-300">Soft: {stats?.soft_violations || 0}</span>
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
                    <thead className="bg-[#131620] sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            {['Severity', 'Constraint', 'Employee', 'Vehicle', 'Detail'].map(col => (
                                <th key={col} className="px-4 py-2.5 text-xs font-semibold text-slate-400 border-b border-slate-700/50 whitespace-nowrap">
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {violations && violations.length > 0 ? (
                            violations.map((v, i) => {
                                const isExpanded = expandedRow === i;
                                const isLong = v.detail && v.detail.length > 100;
                                return (
                                    <tr key={i} className="hover:bg-slate-800/30 transition-colors align-top">
                                        {/* Severity */}
                                        <td className="px-4 py-2.5 text-xs">
                                            <span className={`px-2 py-0.5 rounded-md font-medium ${v.severity === 'HARD'
                                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                }`}>
                                                {v.severity}
                                            </span>
                                        </td>

                                        {/* Constraint */}
                                        <td className="px-4 py-2.5 text-xs text-slate-300 break-words">
                                            {v.constraint_name}
                                        </td>

                                        {/* Employee */}
                                        <td className="px-4 py-2.5 text-xs text-slate-300 font-medium">
                                            {v.employee_id || <span className="text-slate-600">—</span>}
                                        </td>

                                        {/* Vehicle */}
                                        <td className="px-4 py-2.5 text-xs text-slate-300 font-medium">
                                            {v.vehicle_id || <span className="text-slate-600">—</span>}
                                        </td>

                                        {/* Detail — wraps fully, clamp + expand for very long entries */}
                                        <td className="px-4 py-2.5 text-xs text-slate-400">
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
                                                    className="mt-1 text-slate-500 hover:text-slate-300 text-xs transition-colors"
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
                                <td colSpan="5" className="px-4 py-8 text-center text-sm text-slate-500">
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
