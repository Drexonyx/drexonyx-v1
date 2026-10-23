import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Vehicle } from '../types';
import StatusBadge from './StatusBadge';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  vehicle: Vehicle;
  onPress: () => void;
}

export default function VehicleCard({ vehicle, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.top}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{vehicle.name}</Text>
          <Text style={styles.plate}>{vehicle.plateNumber}</Text>
        </View>
        <StatusBadge status={vehicle.status} />
      </View>

      <View style={styles.stats}>
        <Stat label="Speed" value={vehicle.status === 'moving' ? `${vehicle.speed} km/h` : '—'} />
        <StatDivider />
        <Stat label="Odometer" value={`${Math.round(vehicle.odometer).toLocaleString()} km`} />
        <StatDivider />
        <Stat
          label="Updated"
          value={formatDistanceToNow(vehicle.lastUpdate, { addSuffix: true })}
        />
      </View>

      {vehicle.driver && (
        <Text style={styles.driver}>👤 {vehicle.driver}</Text>
      )}
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function StatDivider() {
  return <View style={styles.statDivider} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111116',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  pressed: {
    opacity: 0.75,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: 8,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f0f0f4',
  },
  plate: {
    fontSize: 12,
    color: '#606070',
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#505060',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a0a0b0',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  driver: {
    fontSize: 12,
    color: '#606070',
  },
});
