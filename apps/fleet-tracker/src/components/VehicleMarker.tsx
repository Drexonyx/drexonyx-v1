import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
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

export default function VehicleMarker({ vehicle, onPress, selected }: Props) {
  const color = STATUS_COLOR[vehicle.status] ?? '#6b7280';

  return (
    <Marker
      coordinate={{ latitude: vehicle.lat, longitude: vehicle.lng }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      rotation={vehicle.status === 'moving' ? vehicle.heading : 0}
    >
      <View style={[styles.wrapper, selected && styles.selected]}>
        <View style={[styles.dot, { backgroundColor: color }]}>
          {vehicle.status === 'moving' && (
            <Text style={styles.arrow}>▲</Text>
          )}
        </View>
        {selected && (
          <View style={[styles.pulse, { borderColor: color }]} />
        )}
      </View>
      <Callout tooltip>
        <View style={styles.callout}>
          <Text style={styles.calloutName}>{vehicle.name}</Text>
          <Text style={styles.calloutPlate}>{vehicle.plateNumber}</Text>
          {vehicle.status === 'moving' && (
            <Text style={styles.calloutSpeed}>{vehicle.speed} km/h</Text>
          )}
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  selected: {
    width: 44,
    height: 44,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    opacity: 0.4,
  },
  arrow: {
    fontSize: 9,
    color: '#000',
    fontWeight: '900',
  },
  callout: {
    backgroundColor: '#18181f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 10,
    minWidth: 140,
  },
  calloutName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f0f0f4',
    marginBottom: 2,
  },
  calloutPlate: {
    fontSize: 11,
    color: '#606070',
    marginBottom: 2,
  },
  calloutSpeed: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
});
