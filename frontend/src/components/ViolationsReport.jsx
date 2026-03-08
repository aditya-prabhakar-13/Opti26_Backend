import React from 'react';

export default function ViolationsReport({ evaluations, mapMode }) {
    if (!evaluations) return null;

    // Since evaluations object itself has optimized and baseline objects
    const evaluationData = evaluations[mapMode];

    if (!evaluationData) return null;

    const { stats, violations } = evaluationData;

    return (
        <div className="mt-4 bg-slate-900 border border-slate-700/60 rounded-xl overflow-hidden shadow-lg">
            <div className="px-5 py-3 border-b border-slate-700/60 flex items-center justify-between bg-slate-800/40">
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

            <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-slate-800/60 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 border-b border-slate-700/50">Severity</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 border-b border-slate-700/50">Constraint</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 border-b border-slate-700/50">Employee</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 border-b border-slate-700/50">Vehicle</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 border-b border-slate-700/50">Detail</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {violations && violations.length > 0 ? (
                            violations.map((v, i) => (
                                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-2 text-xs">
                                        <span className={`px-2 py-0.5 rounded-full font-medium ${v.severity === 'HARD'
                                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}>
                                            {v.severity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-xs text-slate-300">{v.constraint_name}</td>
                                    <td className="px-4 py-2 text-xs text-slate-300 font-medium">{v.employee_id || '-'}</td>
                                    <td className="px-4 py-2 text-xs text-slate-300 font-medium">{v.vehicle_id || '-'}</td>
                                    <td className="px-4 py-2 text-xs text-slate-400 truncate max-w-xs" title={v.detail}>
                                        {v.detail}
                                    </td>
                                </tr>
                            ))
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
