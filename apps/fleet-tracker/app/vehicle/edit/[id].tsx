import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVehicle, useUpdateVehicle } from '../../../src/hooks/useFleet';
import type { VehicleStatus } from '../../../src/types/index';

const STATUS_OPTIONS: { label: string; value: VehicleStatus; color: string }[] = [
  { label: 'Parked', value: 'parked', color: '#C8980A' },
  { label: 'Moving', value: 'moving', color: '#10b981' },
  { label: 'Offline', value: 'offline', color: '#505060' },
];

export default function EditVehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: vehicle, isLoading } = useVehicle(id);
  const { mutateAsync, isPending } = useUpdateVehicle();

  const [name, setName]               = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [model, setModel]             = useState('');
  const [driver, setDriver]           = useState('');
  const [status, setStatus]           = useState<VehicleStatus>('parked');
  const [initialised, setInitialised] = useState(false);
  const [error, setError]             = useState('');

  if (vehicle && !initialised) {
    setName(vehicle.name);
    setPlateNumber(vehicle.plateNumber);
    setModel(vehicle.model ?? '');
    setDriver(vehicle.driver ?? '');
    setStatus(vehicle.status);
    setInitialised(true);
  }

  if (isLoading || !initialised) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#C8980A" size="large" />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorStandalone}>Vehicle not found</Text>
      </View>
    );
  }

  async function handleSave() {
    setError('');
    if (!name.trim()) { setError('Vehicle name is required.'); return; }
    if (!plateNumber.trim()) { setError('Plate number is required.'); return; }
    try {
      await mutateAsync({
        id,
        data: {
          name: name.trim(),
          plateNumber: plateNumber.trim(),
          model: model.trim() || undefined,
          driver: driver.trim() || undefined,
          status,
        },
      });
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update vehicle.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="VEHICLE NAME *">
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={t => { setName(t); setError(''); }}
            autoCapitalize="words"
            returnKeyType="next"
            editable={!isPending}
          />
        </Field>

        <Field label="PLATE NUMBER *">
          <TextInput
            style={styles.input}
            value={plateNumber}
            onChangeText={t => { setPlateNumber(t); setError(''); }}
            autoCapitalize="characters"
            returnKeyType="next"
            editable={!isPending}
          />
        </Field>

        <Field label="MODEL (OPTIONAL)">
          <TextInput
            style={styles.input}
            placeholder="e.g. Toyota Hilux 2024"
            placeholderTextColor="#404050"
            value={model}
            onChangeText={setModel}
            autoCapitalize="words"
            returnKeyType="next"
            editable={!isPending}
          />
        </Field>

        <Field label="DRIVER (OPTIONAL)">
          <TextInput
            style={styles.input}
            placeholder="e.g. Ahmed Al Mansoori"
            placeholderTextColor="#404050"
            value={driver}
            onChangeText={setDriver}
            autoCapitalize="words"
            returnKeyType="done"
            editable={!isPending}
          />
        </Field>

        <Field label="STATUS">
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                style={[styles.statusBtn, status === opt.value && { borderColor: opt.color, backgroundColor: `${opt.color}18` }]}
                onPress={() => setStatus(opt.value)}
                disabled={isPending}
              >
                <View style={[styles.statusDot, { backgroundColor: opt.color }]} />
                <Text style={[styles.statusLabel, status === opt.value && { color: opt.color }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.saveBtn, isPending && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0a0a0c' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorStandalone: { fontSize: 14, color: '#ef4444' },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 10, fontWeight: '700', color: '#C8980A',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#111116',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: '#f0f0f4', fontSize: 15,
  },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#111116',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingVertical: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: '700', color: '#606070' },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#C8980A', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
    shadowColor: '#C8980A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#000', letterSpacing: 0.5 },
});
