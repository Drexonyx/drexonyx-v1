import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Vehicle } from '../types';

const STATUS_COLOR: Record<string, string> = {
  moving: '#10b981',
  parked: '#f59e0b',
  offline: '#6b7280',
};

interface Props {
  vehicle: Vehicle;
  onPress: () => void;
  selected?: boolean;
}

// Placeholder component — used when react-native-maps is not available
export default function VehicleMarker({ vehicle, onPress, selected }: Props) {
  const color = STATUS_COLOR[vehicle.status] ?? '#6b7280';
  return (
    <View style={[styles.wrapper, selected && styles.selected]}>
      <View style={[styles.dot, { backgroundColor: color }]}>
        {vehicle.status === 'moving' && <Text style={styles.arrow}>▲</Text>}
      </View>
      {selected && <View style={[styles.pulse, { borderColor: color }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', width: 32, height: 32 },
  selected: { width: 44, height: 44 },
  dot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  pulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2, opacity: 0.4 },
  arrow: { fontSize: 9, color: '#000', fontWeight: '900' },
});
