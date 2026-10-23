import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useVehicles } from '../../src/hooks/useFleet';
import VehicleMarker from '../../src/components/VehicleMarker';
import StatusBadge from '../../src/components/StatusBadge';
import { Vehicle } from '../../src/types';

const DUBAI_REGION = {
  latitude: 25.2048,
  longitude: 55.2708,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export default function MapScreen() {
  const router = useRouter();
  const { data: vehicles, isLoading, error } = useVehicles();
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const mapRef = useRef<MapView>(null);

  function focusVehicle(v: Vehicle) {
    setSelected(v);
    mapRef.current?.animateToRegion({
      latitude: v.lat,
      longitude: v.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 600);
  }

  const moving = vehicles?.filter(v => v.status === 'moving').length ?? 0;
  const parked = vehicles?.filter(v => v.status === 'parked').length ?? 0;
  const offline = vehicles?.filter(v => v.status === 'offline').length ?? 0;

  return (
    <View style={styles.container}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusGroup}>
          <StatChip color="#10b981" count={moving} label="Moving" />
          <StatChip color="#f59e0b" count={parked} label="Parked" />
          <StatChip color="#6b7280" count={offline} label="Offline" />
        </View>
        <Pressable style={styles.settingsBtn} onPress={() => router.push('/settings')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </Pressable>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={DUBAI_REGION}
        customMapStyle={darkMapStyle}
        showsUserLocation={false}
        showsCompass={false}
        showsTraffic={false}
        toolbarEnabled={false}
      >
        {vehicles?.map(v => (
          <VehicleMarker
            key={v.id}
            vehicle={v}
            selected={selected?.id === v.id}
            onPress={() => focusVehicle(v)}
          />
        ))}
      </MapView>

      {isLoading && (
        <View style={styles.loader}>
          <ActivityIndicator color="#C8980A" size="small" />
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ Could not load fleet data</Text>
        </View>
      )}

      {/* Selected vehicle panel */}
      {selected && (
        <View style={styles.panel}>
          <View style={styles.panelTop}>
            <View>
              <Text style={styles.panelName}>{selected.name}</Text>
              <Text style={styles.panelPlate}>{selected.plateNumber}</Text>
            </View>
            <StatusBadge status={selected.status} />
          </View>
          <View style={styles.panelStats}>
            <PanelStat label="Speed" value={selected.status === 'moving' ? `${selected.speed} km/h` : '—'} />
            <PanelStat label="Odometer" value={`${Math.round(selected.odometer).toLocaleString()} km`} />
          </View>
          <View style={styles.panelActions}>
            <Pressable
              style={[styles.panelBtn, styles.panelBtnSecondary]}
              onPress={() => router.push(`/history/${selected.id}`)}
            >
              <Text style={styles.panelBtnTextSecondary}>History</Text>
            </Pressable>
            <Pressable
              style={[styles.panelBtn, styles.panelBtnPrimary]}
              onPress={() => router.push(`/vehicle/${selected.id}`)}
            >
              <Text style={styles.panelBtnText}>View Details</Text>
            </Pressable>
          </View>
          <Pressable style={styles.panelClose} onPress={() => setSelected(null)}>
            <Text style={styles.panelCloseText}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* Bottom quick list */}
      {!selected && vehicles && vehicles.length > 0 && (
        <ScrollView
          horizontal
          style={styles.quickList}
          contentContainerStyle={styles.quickListContent}
          showsHorizontalScrollIndicator={false}
        >
          {vehicles.map(v => (
            <Pressable key={v.id} style={styles.quickChip} onPress={() => focusVehicle(v)}>
              <View style={[styles.quickDot, {
                backgroundColor: v.status === 'moving' ? '#10b981' : v.status === 'parked' ? '#f59e0b' : '#6b7280'
              }]} />
              <Text style={styles.quickName} numberOfLines={1}>{v.name.split(' #')[0]}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function StatChip({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <View style={styles.statChip}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PanelStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.panelStat}>
      <Text style={styles.panelStatLabel}>{label}</Text>
      <Text style={styles.panelStatValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c' },
  statusBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(10,10,12,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  statusGroup: { flexDirection: 'row', gap: 12 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statDot: { width: 7, height: 7, borderRadius: 3.5 },
  statCount: { fontSize: 13, fontWeight: '700', color: '#f0f0f4' },
  statLabel: { fontSize: 12, color: '#606070' },
  settingsBtn: { padding: 4 },
  settingsIcon: { fontSize: 18 },
  loader: {
    position: 'absolute',
    top: 52, right: 16, zIndex: 5,
    backgroundColor: 'rgba(10,10,12,0.8)',
    borderRadius: 8, padding: 8,
  },
  errorBanner: {
    position: 'absolute',
    top: 52, left: 16, right: 16, zIndex: 5,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  errorText: { color: '#ef4444', fontSize: 13 },
  panel: {
    position: 'absolute',
    bottom: 16, left: 16, right: 16,
    backgroundColor: '#111116',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  panelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  panelName: { fontSize: 15, fontWeight: '700', color: '#f0f0f4' },
  panelPlate: { fontSize: 12, color: '#606070', marginTop: 2 },
  panelStats: { flexDirection: 'row', gap: 16 },
  panelStat: { gap: 2 },
  panelStatLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: '#505060' },
  panelStatValue: { fontSize: 14, fontWeight: '600', color: '#a0a0b0' },
  panelActions: { flexDirection: 'row', gap: 10 },
  panelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  panelBtnPrimary: { backgroundColor: '#C8980A' },
  panelBtnSecondary: { backgroundColor: 'rgba(255,255,255,0.07)' },
  panelBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },
  panelBtnTextSecondary: { fontSize: 13, fontWeight: '700', color: '#a0a0b0' },
  panelClose: { position: 'absolute', top: 12, right: 12, padding: 4 },
  panelCloseText: { fontSize: 14, color: '#505060' },
  quickList: {
    position: 'absolute', bottom: 16, left: 0, right: 0,
  },
  quickListContent: { paddingHorizontal: 16, gap: 8 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(17,17,22,0.92)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7,
  },
  quickDot: { width: 7, height: 7, borderRadius: 3.5 },
  quickName: { fontSize: 12, fontWeight: '600', color: '#a0a0b0', maxWidth: 90 },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d3d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d3d55' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
];
