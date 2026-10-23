import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VehicleStatus } from '../types';

const CONFIG: Record<VehicleStatus, { label: string; color: string; bg: string }> = {
  moving: { label: 'Moving', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  parked: { label: 'Parked', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  offline: { label: 'Offline', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

interface Props {
  status: VehicleStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, size === 'sm' && styles.sm]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.label, { color: cfg.color }, size === 'sm' && styles.labelSm]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  labelSm: {
    fontSize: 11,
  },
});
