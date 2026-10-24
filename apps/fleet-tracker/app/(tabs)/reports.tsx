import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable,
} from 'react-native';
import { useMileageReports } from '../../src/hooks/useFleet';
import { MileageReport } from '../../src/types';

type Period = 'today' | 'week' | 'month';

export default function ReportsScreen() {
  const { data: reports, isLoading, error, refetch } = useMileageReports();
  const [period, setPeriod] = useState<Period>('today');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = reports
    ? [...reports].sort((a, b) => {
        const va = a[period];
        const vb = b[period];
        return sortAsc ? va - vb : vb - va;
      })
    : [];

  const total = sorted.reduce((sum, r) => sum + r[period], 0);

  return (
    <View style={styles.container}>
      {/* Period selector */}
      <View style={styles.periodRow}>
        {(['today', 'week', 'month'] as Period[]).map(p => (
          <Pressable
            key={p}
            style={[styles.periodBtn, period === p && styles.periodActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodLabel, period === p && styles.periodLabelActive]}>
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#C8980A" size="large" />
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ Failed to load reports</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {sorted.length > 0 && (
        <FlatList
          data={sorted}
          keyExtractor={item => item.vehicleId}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <MileageRow report={item} period={period} rank={index + 1} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Fleet Total</Text>
                <Text style={styles.totalValue}>{total.toFixed(0)} km</Text>
                <Text style={styles.totalPeriod}>
                  {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
                </Text>
              </View>
              <Pressable style={styles.sortBtn} onPress={() => setSortAsc(p => !p)}>
                <Text style={styles.sortText}>
                  {sortAsc ? '↑ Least first' : '↓ Most first'}
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

function MileageRow({
  report,
  period,
  rank,
}: {
  report: MileageReport;
  period: Period;
  rank: number;
}) {
  const value = report[period];
  const max = 300;
  const pct = Math.min(1, value / max);

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rank}>#{rank}</Text>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>{report.vehicleName}</Text>
          <Text style={styles.rowPlate}>{report.plateNumber}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{value.toFixed(1)} km</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${pct * 100}%` as unknown as number }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c' },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    gap: 8,
  },
  periodBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#111116',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  periodActive: {
    backgroundColor: 'rgba(200,152,10,0.15)',
    borderColor: 'rgba(200,152,10,0.4)',
  },
  periodLabel: { fontSize: 12, fontWeight: '700', color: '#505060' },
  periodLabelActive: { color: '#C8980A' },
  list: { padding: 16, paddingTop: 0 },
  header: { marginBottom: 16, gap: 10 },
  totalCard: {
    backgroundColor: '#111116',
    borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: 'rgba(200,152,10,0.2)',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: '#C8980A' },
  totalValue: { fontSize: 40, fontWeight: '900', color: '#f0f0f4', letterSpacing: -2, marginTop: 4 },
  totalPeriod: { fontSize: 13, color: '#606070', marginTop: 2 },
  sortBtn: { alignSelf: 'flex-end' },
  sortText: { fontSize: 12, color: '#606070', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111116',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rank: { fontSize: 12, fontWeight: '700', color: '#505060', width: 24 },
  rowInfo: { flex: 1, gap: 1 },
  rowName: { fontSize: 13, fontWeight: '700', color: '#f0f0f4' },
  rowPlate: { fontSize: 11, color: '#505060' },
  rowRight: { alignItems: 'flex-end', gap: 4, minWidth: 90 },
  rowValue: { fontSize: 14, fontWeight: '700', color: '#C8980A' },
  bar: {
    width: 80, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  barFill: {
    height: 4, borderRadius: 2,
    backgroundColor: 'rgba(200,152,10,0.6)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, color: '#ef4444' },
  retryBtn: { backgroundColor: 'rgba(200,152,10,0.15)', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#C8980A', fontWeight: '700' },
});
