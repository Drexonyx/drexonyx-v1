import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTrips } from '../../src/hooks/useFleet';
import { Trip } from '../../src/types';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export default function HistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedDay, setSelectedDay] = useState(0); // 0 = today, 1 = yesterday, etc.
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const from = startOfDay(subDays(new Date(), selectedDay));
  const to = endOfDay(subDays(new Date(), selectedDay));
  const { data: trips, isLoading } = useTrips(id, from, to);

  const days = Array.from({ length: 7 }, (_, i) => i);

  return (
    <View style={styles.container}>
      {/* Day selector */}
      <View style={styles.dayScroll}>
        {days.map(day => {
          const d = subDays(new Date(), day);
          return (
            <Pressable
              key={day}
              style={[styles.dayBtn, selectedDay === day && styles.dayActive]}
              onPress={() => { setSelectedDay(day); setSelectedTrip(null); }}
            >
              <Text style={[styles.dayLabel, selectedDay === day && styles.dayLabelActive]}>
                {day === 0 ? 'Today' : day === 1 ? 'Yesterday' : format(d, 'EEE')}
              </Text>
              <Text style={[styles.dayDate, selectedDay === day && styles.dayDateActive]}>
                {format(d, 'dd MMM')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Map for selected trip */}
      {selectedTrip && selectedTrip.points.length > 1 && (
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
            <Text style={styles.mapPlaceholderText}>
              {selectedTrip.points.length} route points
            </Text>
            <Text style={styles.mapPlaceholderSub}>Google Maps API key required to show route</Text>
          </View>
          <Pressable style={styles.mapCloseBtn} onPress={() => setSelectedTrip(null)}>
            <Text style={styles.mapCloseText}>✕ Close</Text>
          </Pressable>
        </View>
      )}

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#C8980A" />
        </View>
      )}

      {/* Trip list */}
      <FlatList
        data={trips}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyText}>No trips on this day</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={trips?.length ? (
          <View style={styles.summaryRow}>
            <SummaryChip
              label="Trips"
              value={String(trips.length)}
            />
            <SummaryChip
              label="Distance"
              value={`${trips.reduce((s, t) => s + t.distance, 0).toFixed(1)} km`}
            />
            <SummaryChip
              label="Drive time"
              value={formatDuration(trips.reduce((s, t) => s + t.duration, 0))}
            />
          </View>
        ) : null}
        renderItem={({ item }) => (
          <TripRow
            trip={item}
            selected={selectedTrip?.id === item.id}
            onPress={() => setSelectedTrip(prev => prev?.id === item.id ? null : item)}
          />
        )}
      />
    </View>
  );
}

function TripRow({
  trip, selected, onPress,
}: {
  trip: Trip; selected: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tripCard, selected && styles.tripCardActive]}
      onPress={onPress}
    >
      <View style={styles.tripLeft}>
        <View style={styles.tripDot} />
        <View style={styles.tripLine} />
        <View style={[styles.tripDot, styles.tripDotEnd]} />
      </View>
      <View style={styles.tripBody}>
        <Text style={styles.tripTime}>{format(trip.startTime, 'HH:mm')} → {format(trip.endTime, 'HH:mm')}</Text>
        <View style={styles.tripStats}>
          <Text style={styles.tripStat}>📏 {trip.distance} km</Text>
          <Text style={styles.tripStat}>⏱ {formatDuration(trip.duration)}</Text>
        </View>
        {selected && (
          <Text style={styles.tripReplay}>Tap to show/hide route map</Text>
        )}
      </View>
      <Text style={styles.tripChevron}>{selected ? '▲' : '▼'}</Text>
    </Pressable>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryChip}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c' },
  dayScroll: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 6,
  },
  dayBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#111116', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  dayActive: { backgroundColor: 'rgba(200,152,10,0.15)', borderColor: 'rgba(200,152,10,0.4)' },
  dayLabel: { fontSize: 10, fontWeight: '700', color: '#505060' },
  dayLabelActive: { color: '#C8980A' },
  dayDate: { fontSize: 11, color: '#404050', marginTop: 1 },
  dayDateActive: { color: '#a07808' },
  mapContainer: { height: 220, position: 'relative' },
  mapPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#0d0d14',
  },
  mapPlaceholderIcon: { fontSize: 32 },
  mapPlaceholderText: { fontSize: 13, fontWeight: '700', color: '#f0f0f4' },
  mapPlaceholderSub: { fontSize: 11, color: '#505060', textAlign: 'center', paddingHorizontal: 20 },
  mapCloseBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(10,10,12,0.85)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  mapCloseText: { fontSize: 12, fontWeight: '600', color: '#a0a0b0' },
  list: { padding: 16, paddingTop: 4 },
  center: { padding: 20, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 13, color: '#505060' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryChip: {
    flex: 1, backgroundColor: '#111116', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center',
  },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: '#505060' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#C8980A', marginTop: 2 },
  tripCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111116', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12,
  },
  tripCardActive: { borderColor: 'rgba(200,152,10,0.3)' },
  tripLeft: { alignItems: 'center', gap: 0, paddingVertical: 2 },
  tripDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  tripDotEnd: { backgroundColor: '#ef4444' },
  tripLine: { width: 2, flex: 1, minHeight: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  tripBody: { flex: 1, gap: 4 },
  tripTime: { fontSize: 14, fontWeight: '700', color: '#f0f0f4' },
  tripStats: { flexDirection: 'row', gap: 12 },
  tripStat: { fontSize: 12, color: '#a0a0b0' },
  tripReplay: { fontSize: 11, color: '#C8980A', marginTop: 2 },
  tripChevron: { fontSize: 11, color: '#505060' },
});

