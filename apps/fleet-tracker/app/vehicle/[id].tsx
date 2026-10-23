import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVehicle } from '../../src/hooks/useFleet';
import StatusBadge from '../../src/components/StatusBadge';
import { formatDistanceToNow, format } from 'date-fns';

export default function VehicleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: vehicle, isLoading } = useVehicle(id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#C8980A" size="large" />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Vehicle not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.vehicleName}>{vehicle.name}</Text>
            <Text style={styles.vehiclePlate}>{vehicle.plateNumber}</Text>
            {vehicle.model && <Text style={styles.vehicleModel}>{vehicle.model}</Text>}
          </View>
          <StatusBadge status={vehicle.status} />
        </View>
        {vehicle.driver && (
          <View style={styles.driverRow}>
            <Text style={styles.driverIcon}>👤</Text>
            <Text style={styles.driverName}>{vehicle.driver}</Text>
          </View>
        )}
      </View>

      {/* Live stats */}
      <Text style={styles.sectionLabel}>Live Data</Text>
      <View style={styles.statsGrid}>
        <StatCard
          icon="🚀"
          label="Speed"
          value={vehicle.status === 'moving' ? `${vehicle.speed}` : '0'}
          unit="km/h"
          accent={vehicle.status === 'moving'}
        />
        <StatCard
          icon="📍"
          label="Odometer"
          value={Math.round(vehicle.odometer).toLocaleString()}
          unit="km"
        />
        <StatCard
          icon="🧭"
          label="Heading"
          value={headingLabel(vehicle.heading)}
          unit=""
        />
        <StatCard
          icon="🕐"
          label="Last Update"
          value={formatDistanceToNow(vehicle.lastUpdate)}
          unit="ago"
          small
        />
      </View>

      {/* Coordinates */}
      <Text style={styles.sectionLabel}>Location</Text>
      <View style={styles.coordCard}>
        <CoordRow label="Latitude" value={vehicle.lat.toFixed(6)} />
        <View style={styles.coordDivider} />
        <CoordRow label="Longitude" value={vehicle.lng.toFixed(6)} />
        <View style={styles.coordDivider} />
        <CoordRow label="Last seen" value={format(vehicle.lastUpdate, 'HH:mm:ss · dd MMM yyyy')} />
      </View>

      {/* Actions */}
      <Text style={styles.sectionLabel}>Actions</Text>
      <View style={styles.actions}>
        <ActionBtn
          icon="📍"
          label="View on Map"
          onPress={() => router.push('/(tabs)/map')}
        />
        <ActionBtn
          icon="🗓️"
          label="Trip History"
          onPress={() => router.push(`/history/${vehicle.id}`)}
          accent
        />
      </View>
    </ScrollView>
  );
}

function StatCard({
  icon, label, value, unit, accent, small,
}: {
  icon: string; label: string; value: string; unit: string; accent?: boolean; small?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statValueAccent, small && styles.statValueSm]}>
        {value}
      </Text>
      {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
    </View>
  );
}

function CoordRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.coordRow}>
      <Text style={styles.coordLabel}>{label}</Text>
      <Text style={styles.coordValue}>{value}</Text>
    </View>
  );
}

function ActionBtn({
  icon, label, onPress, accent,
}: {
  icon: string; label: string; onPress: () => void; accent?: boolean;
}) {
  return (
    <Pressable
      style={[styles.actionBtn, accent && styles.actionBtnAccent]}
      onPress={onPress}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, accent && styles.actionLabelAccent]}>{label}</Text>
    </Pressable>
  );
}

function headingLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c' },
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 14, color: '#ef4444' },
  headerCard: {
    backgroundColor: '#111116', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vehicleName: { fontSize: 18, fontWeight: '800', color: '#f0f0f4' },
  vehiclePlate: { fontSize: 13, color: '#606070', marginTop: 2 },
  vehicleModel: { fontSize: 12, color: '#505060', marginTop: 2 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverIcon: { fontSize: 14 },
  driverName: { fontSize: 13, color: '#a0a0b0', fontWeight: '500' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
    textTransform: 'uppercase', color: '#505060', marginTop: 12, marginBottom: 4,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: '#111116', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    gap: 2,
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: '#505060' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#f0f0f4', letterSpacing: -0.5 },
  statValueAccent: { color: '#10b981' },
  statValueSm: { fontSize: 14, letterSpacing: 0 },
  statUnit: { fontSize: 11, color: '#606070', fontWeight: '600' },
  coordCard: {
    backgroundColor: '#111116', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  coordRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12,
  },
  coordDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 12 },
  coordLabel: { fontSize: 12, color: '#505060', fontWeight: '600' },
  coordValue: { fontSize: 13, color: '#a0a0b0', fontWeight: '500', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#111116', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  actionBtnAccent: { backgroundColor: '#C8980A', borderColor: '#C8980A' },
  actionIcon: { fontSize: 16 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#a0a0b0' },
  actionLabelAccent: { color: '#000' },
});
