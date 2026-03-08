import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 30,
        backgroundColor: '#ffffff'
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
        fontWeight: 'bold',
        color: '#0f1623'
    },
    section: {
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 16,
        marginBottom: 10,
        color: '#ea580c',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingBottom: 5
    },
    row: {
        flexDirection: 'row',
        marginBottom: 5
    },
    label: {
        width: 150,
        fontSize: 11,
        color: '#475569',
        fontWeight: 'bold'
    },
    value: {
        flex: 1,
        fontSize: 11,
        color: '#0f1623'
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRightWidth: 0,
        borderBottomWidth: 0
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row'
    },
    tableColHeader: {
        width: '25%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: '#f8fafc'
    },
    tableCol: {
        width: '25%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderLeftWidth: 0,
        borderTopWidth: 0
    },
    tableCellHeader: {
        margin: 5,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#475569'
    },
    tableCell: {
        margin: 5,
        fontSize: 10,
        color: '#0f1623'
    },
    mapImage: {
        width: '100%',
        height: 300,
        objectFit: 'cover',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 10
    }
});

export const TestcasePDF = ({ result, mapMode, metrics, mapImage }) => {
    const violations = result.evaluations?.[mapMode]?.violations || [];

    const currentResult = result?.[
        mapMode === "optimized"
            ? "result"
            : mapMode === "infeasible"
                ? "resultInfeasible"
                : "resultNoConstraints"
    ];

    const vehicles = currentResult?.vehicles || [];

    const formatCurrency = (val) => val != null ? `Rs ${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
    const formatDist = (val) => val != null ? `${Number(val).toFixed(2)} km` : '-';
    const formatMin = (mins) => {
        if (mins == null) return '-';
        const m = Math.round(mins);
        if (m < 60) return `${m}m`;
        return `${Math.floor(m / 60)}h ${m % 60}m`;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.title}>Optimization Report</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Overview</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Test Case Name:</Text>
                        <Text style={styles.value}>{result.original_filename || result.filename}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Optimization Mode:</Text>
                        <Text style={styles.value}>{mapMode}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Key Metrics</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Vehicles Used:</Text>
                        <Text style={styles.value}>{metrics?.vehicles_used ?? '-'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Employees Covered:</Text>
                        <Text style={styles.value}>{metrics?.employees_covered ?? '-'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Total Distance:</Text>
                        <Text style={styles.value}>{formatDist(metrics?.total_distance_km)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Total Objective Cost:</Text>
                        <Text style={styles.value}>{formatCurrency(metrics?.total_cost)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Travel Time:</Text>
                        <Text style={styles.value}>{formatMin(metrics?.optimized_travel_time_min)}</Text>
                    </View>
                </View>

                {mapImage && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Route Map</Text>
                        <Image src={mapImage} style={styles.mapImage} />
                    </View>
                )}

                {vehicles.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Vehicles & Trips</Text>
                        {vehicles.map((vehicle, vIdx) => {
                            const pAccent = ['#f59e0b', '#38bdf8', '#a78bfa', '#34d399', '#fb7185'][vIdx % 5];
                            const pBg = `${pAccent}1A`; // ~10% opacity hex
                            const vehicleId = vehicle.vehicle_id;
                            const vehicleTrips = vehicle.trips || [];

                            return (
                                <View key={vehicleId} style={{
                                    marginBottom: 15,
                                    borderWidth: 1,
                                    borderColor: pAccent,
                                    borderRadius: 8,
                                    overflow: 'hidden'
                                }}>
                                    {/* Vehicle Header */}
                                    <View style={{
                                        backgroundColor: pBg,
                                        padding: 10,
                                        borderBottomWidth: 1,
                                        borderBottomColor: pAccent,
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{
                                                backgroundColor: pAccent,
                                                borderRadius: 4,
                                                padding: 4,
                                                marginRight: 8
                                            }}>
                                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0f172a' }}>{vehicleId}</Text>
                                            </View>
                                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0f172a' }}>{vehicleId}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#64748b' }}>TRIPS</Text>
                                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0f172a' }}>{vehicleTrips.length}</Text>
                                        </View>
                                    </View>

                                    {/* Trips */}
                                    <View>
                                        {vehicleTrips.sort((a, b) => a.trip_number - b.trip_number).map((trip, tIdx) => (
                                            <View key={trip.trip_number} style={{
                                                padding: 10,
                                                borderTopWidth: tIdx > 0 ? 1 : 0,
                                                borderTopColor: '#e2e8f0'
                                            }}>
                                                {/* Trip Header */}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <View style={{
                                                            width: 16, height: 16,
                                                            borderRadius: 8,
                                                            backgroundColor: pBg,
                                                            borderWidth: 1,
                                                            borderColor: pAccent,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: 6
                                                        }}>
                                                            <Text style={{ fontSize: 8, fontWeight: 'bold', color: pAccent }}>{trip.trip_number}</Text>
                                                        </View>
                                                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0f172a', marginRight: 8 }}>Trip {trip.trip_number}</Text>
                                                        <Text style={{ fontSize: 9, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                                                            {trip.start_time || '-'} → {trip.end_time || '-'}
                                                        </Text>
                                                    </View>

                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Text style={{ fontSize: 9, color: '#64748b', marginRight: 8 }}>
                                                            Dist: <Text style={{ color: '#0f172a', fontWeight: 'bold' }}>{formatDist(trip.trip_distance_km)}</Text>
                                                        </Text>
                                                        <Text style={{ fontSize: 9, color: '#64748b', marginRight: 8 }}>
                                                            Cost: <Text style={{ color: pAccent, fontWeight: 'bold' }}>{formatCurrency(trip.trip_cost || 0)}</Text>
                                                        </Text>
                                                        <Text style={{ fontSize: 9, color: '#64748b' }}>
                                                            Load: <Text style={{ color: '#0f172a', fontWeight: 'bold' }}>{trip.load}/{trip.capacity || trip.capacity_limit}</Text>
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Route Tokens Summary */}
                                                <View style={{ marginBottom: 10, paddingLeft: 22 }}>
                                                    <Text style={{ fontSize: 9, color: '#64748b' }}>
                                                        START → {(trip.route || []).filter(t => t !== 'START' && t !== 'END').join(' → ')} → END
                                                    </Text>
                                                </View>

                                                {/* Employees Table */}
                                                {trip.passengers?.length > 0 && (
                                                    <View style={{ paddingLeft: 22 }}>
                                                        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 4, marginBottom: 4 }}>
                                                            <Text style={{ width: '25%', fontSize: 8, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Employee</Text>
                                                            <Text style={{ width: '25%', fontSize: 8, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Pickup Time</Text>
                                                            <Text style={{ width: '25%', fontSize: 8, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Drop Time</Text>
                                                            <Text style={{ width: '25%', fontSize: 8, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Ride Duration</Text>
                                                        </View>

                                                        {trip.passengers.map((p, pIdx) => {
                                                            let rideDurationMin = null;
                                                            if (p.pickup_time && p.drop_time) {
                                                                const [h1, m1] = p.pickup_time.split(':').map(Number);
                                                                const [h2, m2] = p.drop_time.split(':').map(Number);
                                                                rideDurationMin = (h2 * 60 + m2) - (h1 * 60 + m1);
                                                            }
                                                            return (
                                                                <View key={p.employee_id || pIdx} style={{
                                                                    flexDirection: 'row',
                                                                    alignItems: 'center',
                                                                    paddingVertical: 4,
                                                                    borderBottomWidth: pIdx < trip.passengers.length - 1 ? 1 : 0,
                                                                    borderBottomColor: '#f8fafc'
                                                                }}>
                                                                    <View style={{ width: '25%' }}>
                                                                        <View style={{
                                                                            backgroundColor: pBg,
                                                                            borderWidth: 1,
                                                                            borderColor: pAccent,
                                                                            borderRadius: 4,
                                                                            paddingVertical: 2,
                                                                            paddingHorizontal: 6,
                                                                            alignSelf: 'flex-start'
                                                                        }}>
                                                                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: pAccent }}>{p.employee_id}</Text>
                                                                        </View>
                                                                    </View>
                                                                    <Text style={{ width: '25%', fontSize: 9, fontWeight: 'bold', color: '#0f172a' }}>{p.pickup_time || '-'}</Text>
                                                                    <Text style={{ width: '25%', fontSize: 9, fontWeight: 'bold', color: '#0f172a' }}>{p.drop_time || '-'}</Text>
                                                                    <Text style={{ width: '25%', fontSize: 9, color: '#64748b' }}>{formatMin(rideDurationMin)}</Text>
                                                                </View>
                                                            );
                                                        })}
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </Page>

            <Page size="A4" style={styles.page}>
                <Text style={styles.title}>Constraint Analysis Report</Text>

                {violations.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recorded Violations ({violations.length})</Text>
                        <View style={styles.table}>
                            <View style={styles.tableRow}>
                                <View style={{ ...styles.tableColHeader, width: '15%' }}>
                                    <Text style={styles.tableCellHeader}>Severity</Text>
                                </View>
                                <View style={{ ...styles.tableColHeader, width: '30%' }}>
                                    <Text style={styles.tableCellHeader}>Constraint</Text>
                                </View>
                                <View style={{ ...styles.tableColHeader, width: '15%' }}>
                                    <Text style={styles.tableCellHeader}>Emp ID</Text>
                                </View>
                                <View style={{ ...styles.tableColHeader, width: '40%' }}>
                                    <Text style={styles.tableCellHeader}>Detail</Text>
                                </View>
                            </View>

                            {violations.map((v, i) => (
                                <View style={styles.tableRow} key={i}>
                                    <View style={{ ...styles.tableCol, width: '15%', backgroundColor: v.severity === 'HARD' ? '#fecaca' : '#fef3c7' }}>
                                        <Text style={{ ...styles.tableCell, fontWeight: 'bold', color: v.severity === 'HARD' ? '#991b1b' : '#92400e' }}>{v.severity}</Text>
                                    </View>
                                    <View style={{ ...styles.tableCol, width: '30%' }}>
                                        <Text style={styles.tableCell}>{v.constraint_name}</Text>
                                    </View>
                                    <View style={{ ...styles.tableCol, width: '15%' }}>
                                        <Text style={styles.tableCell}>{v.employee_id || '-'}</Text>
                                    </View>
                                    <View style={{ ...styles.tableCol, width: '40%' }}>
                                        <Text style={styles.tableCell}>{v.detail}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Compliance Status</Text>
                        <Text style={styles.tableCell}>No constraint violations found. The optimization plan fully adheres to all defined fleet rules and safety standards.</Text>
                    </View>
                )}
            </Page>
        </Document>
    );
};
