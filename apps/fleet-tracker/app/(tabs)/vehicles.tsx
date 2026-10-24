import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVehicles } from '../../src/hooks/useFleet';
import VehicleCard from '../../src/components/VehicleCard';
import { VehicleStatus } from '../../src/types';

const FILTERS: { label: string; value: VehicleStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: '🟢 Moving', value: 'moving' },
  { label: '🟡 Parked', value: 'parked' },
  { label: '⚫ Offline', value: 'offline' },
];

export default function VehiclesScreen() {
  const router = useRouter();
  const { data: vehicles, isLoading, error, refetch } = useVehicles();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VehicleStatus | 'all'>('all');

  const filtered = vehicles?.filter(v => {
    const matchStatus = filter === 'all' || v.status === filter;
    const matchSearch =
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.driver?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Search vehicle or driver…"
            placeholderTextColor="#505060"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable style={styles.addBtn} onPress={() => router.push('/vehicle/add')}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterLabel, filter === f.value && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#C8980A" size="large" />
          <Text style={styles.loadingText}>Loading fleet…</Text>
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ Failed to load fleet data</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {filtered && (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <VehicleCard
              vehicle={item}
              onPress={() => router.push(`/vehicle/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🚗</Text>
              <Text style={styles.emptyText}>No vehicles found</Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={styles.count}>
              {filtered.length} vehicle{filtered.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111116',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#C8980A',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C8980A', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
  },
  addBtnText: { fontSize: 22, fontWeight: '700', color: '#000', lineHeight: 26 },
  searchIcon: { fontSize: 14 },
  input: { flex: 1, fontSize: 14, color: '#f0f0f4' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#111116',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  filterActive: {
    backgroundColor: 'rgba(200,152,10,0.15)',
    borderColor: 'rgba(200,152,10,0.4)',
  },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#606070' },
  filterLabelActive: { color: '#C8980A' },
  list: { padding: 16, paddingTop: 4 },
  separator: { height: 8 },
  count: {
    fontSize: 12, fontWeight: '600', color: '#505060',
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#606070' },
  errorText: { fontSize: 14, color: '#ef4444' },
  retryBtn: {
    backgroundColor: 'rgba(200,152,10,0.15)',
    borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10,
  },
  retryText: { color: '#C8980A', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: '#505060' },
});
