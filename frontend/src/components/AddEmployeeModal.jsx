import React, { useState } from 'react';

export default function AddEmployeeModal({ isOpen, onClose, onSubmit }) {
    const [employees, setEmployees] = useState([
        {
            id: '',
            priority: 3,
            lat: '',
            lng: '',
            earliest_pickup: '08:00',
            latest_drop: '10:00',
            vehicle_preference: 'any',
            sharing_preference: 'triple',
            baseline_cost: '',
        }
    ]);

    if (!isOpen) return null;

    const handleAddRow = () => {
        setEmployees([
            ...employees,
            {
                id: '',
                priority: 3,
                lat: '',
                lng: '',
                earliest_pickup: '08:00',
                latest_drop: '10:00',
                vehicle_preference: 'any',
                sharing_preference: 'triple',
                baseline_cost: '',
            }
        ]);
    };

    const handleRemoveRow = (index) => {
        if (employees.length === 1) return;
        const newEmployees = [...employees];
        newEmployees.splice(index, 1);
        setEmployees(newEmployees);
    };

    const handleChange = (index, field, value) => {
        const newEmployees = [...employees];
        newEmployees[index][field] = value;
        setEmployees(newEmployees);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(employees);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="w-full max-w-6xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-700/60 flex justify-between items-center bg-slate-800/40">
                    <h2 className="text-lg font-bold text-white tracking-wide">Add Employees</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700/50">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead>
                                <tr>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-400">Emp ID</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-400">Priority (1-5)</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-400">Pickup Lat</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-400">Pickup Lng</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-400">Earliest PU</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-400">Latest Drop</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-400">Vehicle Pref</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-400">Sharing Pref</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-400">Baseline Cost</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {employees.map((emp, index) => (
                                    <tr key={index}>
                                        <td className="px-3 py-3"><input required value={emp.id} onChange={(e) => handleChange(index, 'id', e.target.value)} placeholder="E99" className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500" /></td>
                                        <td className="px-3 py-3"><input required type="number" min="1" max="5" value={emp.priority} onChange={(e) => handleChange(index, 'priority', parseInt(e.target.value))} className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500" /></td>
                                        <td className="px-3 py-3"><input required type="number" step="any" value={emp.lat} onChange={(e) => handleChange(index, 'lat', parseFloat(e.target.value))} placeholder="12.9" className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500" /></td>
                                        <td className="px-3 py-3"><input required type="number" step="any" value={emp.lng} onChange={(e) => handleChange(index, 'lng', parseFloat(e.target.value))} placeholder="77.6" className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500" /></td>
                                        <td className="px-3 py-3"><input required type="time" value={emp.earliest_pickup} onChange={(e) => handleChange(index, 'earliest_pickup', e.target.value)} className="w-28 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-emerald-500 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" /></td>
                                        <td className="px-3 py-3"><input required type="time" value={emp.latest_drop} onChange={(e) => handleChange(index, 'latest_drop', e.target.value)} className="w-28 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-emerald-500 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" /></td>
                                        <td className="px-3 py-3">
                                            <select value={emp.vehicle_preference} onChange={(e) => handleChange(index, 'vehicle_preference', e.target.value)} className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                                                <option value="any">Any</option>
                                                <option value="normal">Normal</option>
                                                <option value="premium">Premium</option>
                                            </select>
                                        </td>
                                        <td className="px-3 py-3">
                                            <select value={emp.sharing_preference} onChange={(e) => handleChange(index, 'sharing_preference', e.target.value)} className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                                                <option value="single">Single</option>
                                                <option value="double">Double</option>
                                                <option value="triple">Triple</option>
                                            </select>
                                        </td>
                                        <td className="px-3 py-3"><input required type="number" min="0" value={emp.baseline_cost} onChange={(e) => handleChange(index, 'baseline_cost', parseFloat(e.target.value))} placeholder="₹ 450" className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500" /></td>
                                        <td className="px-3 py-3">
                                            <button type="button" onClick={() => handleRemoveRow(index)} disabled={employees.length === 1} className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-rose-400">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button type="button" onClick={handleAddRow} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white rounded-lg transition-colors border border-slate-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Row
                    </button>

                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-700/60">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-900/20 transition-all flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Submit Optimization
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
