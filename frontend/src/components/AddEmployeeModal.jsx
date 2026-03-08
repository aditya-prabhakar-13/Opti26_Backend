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
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999, /* High z-index to stay over leaflet's 1000 stack */
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: 'rgba(11, 15, 25, 0.85)',
            backdropFilter: 'blur(8px)',
            fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif"
        }}>
            <div style={{
                width: '100%',
                maxWidth: '1200px',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.3
                    }}>Add Employees</h2>
                    <button onClick={onClose} style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-3)',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        transition: 'background 120ms ease'
                    }}
                        onMouseEnter={e => {
                            e.currentTarget.style.color = "var(--color-text)";
                            e.currentTarget.style.backgroundColor = "var(--color-surface-2)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.color = "var(--color-text-3)";
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    overflow: 'hidden'
                }}>
                    <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                        <table style={{
                            width: '100%',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            borderCollapse: 'collapse'
                        }}>
                            <thead style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 10,
                                backgroundColor: 'var(--color-surface)',
                                borderBottom: '1px solid var(--color-border)'
                            }}>
                                <tr>
                                    {['Emp ID', 'Priority (1-5)', 'Pickup Lat', 'Pickup Lng', 'Earliest PU', 'Latest Drop', 'Vehicle Pref', 'Sharing Pref', 'Baseline Cost'].map((h, i) => (
                                        <th key={i} style={{
                                            padding: '12px 16px',
                                            fontSize: '0.6875rem',
                                            fontWeight: 600,
                                            color: 'var(--color-text-3)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em'
                                        }}>{h}</th>
                                    ))}
                                    <th style={{ padding: '12px 16px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp, index) => {
                                    const inputStyle = {
                                        width: '100%',
                                        minWidth: '80px',
                                        backgroundColor: 'var(--color-surface-2)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '6px',
                                        padding: '8px 12px',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        color: 'var(--color-text)',
                                        outline: 'none',
                                        transition: 'border-color 150ms ease'
                                    };
                                    const wrapStyle = { padding: '12px 16px', borderBottom: '1px solid var(--color-border)' };

                                    return (
                                        <tr key={index} style={{ transition: 'background-color 150ms' }}>
                                            <td style={wrapStyle}><input required value={emp.id} onChange={(e) => handleChange(index, 'id', e.target.value)} placeholder="E99" style={inputStyle} /></td>
                                            <td style={wrapStyle}><input required type="number" min="1" max="5" value={emp.priority} onChange={(e) => handleChange(index, 'priority', parseInt(e.target.value))} style={inputStyle} /></td>
                                            <td style={wrapStyle}><input required type="number" step="any" value={emp.lat} onChange={(e) => handleChange(index, 'lat', parseFloat(e.target.value))} placeholder="12.9" style={inputStyle} /></td>
                                            <td style={wrapStyle}><input required type="number" step="any" value={emp.lng} onChange={(e) => handleChange(index, 'lng', parseFloat(e.target.value))} placeholder="77.6" style={inputStyle} /></td>
                                            <td style={wrapStyle}><input required type="time" value={emp.earliest_pickup} onChange={(e) => handleChange(index, 'earliest_pickup', e.target.value)} style={{ ...inputStyle, textAlign: 'center', colorScheme: 'dark' }} /></td>
                                            <td style={wrapStyle}><input required type="time" value={emp.latest_drop} onChange={(e) => handleChange(index, 'latest_drop', e.target.value)} style={{ ...inputStyle, textAlign: 'center', colorScheme: 'dark' }} /></td>
                                            <td style={wrapStyle}>
                                                <select value={emp.vehicle_preference} onChange={(e) => handleChange(index, 'vehicle_preference', e.target.value)} style={inputStyle}>
                                                    <option value="any">Any</option>
                                                    <option value="normal">Normal</option>
                                                    <option value="premium">Premium</option>
                                                </select>
                                            </td>
                                            <td style={wrapStyle}>
                                                <select value={emp.sharing_preference} onChange={(e) => handleChange(index, 'sharing_preference', e.target.value)} style={inputStyle}>
                                                    <option value="triple">Triple</option>
                                                    <option value="double">Double</option>
                                                    <option value="single">Single</option>
                                                </select>
                                            </td>
                                            <td style={wrapStyle}><input required type="number" step="any" value={emp.baseline_cost} onChange={(e) => handleChange(index, 'baseline_cost', parseFloat(e.target.value))} placeholder="350" style={inputStyle} /></td>
                                            <td style={{ ...wrapStyle, textAlign: 'right' }}>
                                                {employees.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveRow(index)} style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        padding: '6px',
                                                        borderRadius: '6px',
                                                    }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <button type="button" onClick={handleAddRow} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 120ms ease'
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = 'var(--color-border)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = 'var(--color-surface-2)';
                            }}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Row
                        </button>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" onClick={onClose} style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                backgroundColor: 'transparent',
                                border: '1px solid transparent',
                                color: 'var(--color-text-2)',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'color 120ms ease'
                            }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-2)'}>
                                Cancel
                            </button>
                            <button type="submit" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 24px',
                                borderRadius: '6px',
                                background: 'var(--color-accent)',
                                border: 'none',
                                color: '#fff',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                letterSpacing: '-0.01em',
                                transition: 'background 120ms ease'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-accent-h)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent)'}>
                                Process Dynamic Optimization
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
