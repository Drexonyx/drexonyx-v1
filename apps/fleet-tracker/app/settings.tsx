import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { isDevMode } from '../src/services/license';
import { revoke } from '../src/services/license';
import { signOut, getSession } from '../src/services/auth';
import type { AuthSession } from '../src/services/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [devMode] = useState(() => isDevMode());
  const hasBakedToken = !!(Constants.expoConfig?.extra?.wialonToken as string);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    getSession().then(setSession).catch(() => {});
  }, []);

  async function handleRevokeLicense() {
    Alert.alert(
      'Revoke License',
      'This will remove the activation key from this device. You will need to re-enter your key to use the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            await revoke();
            qc.clear();
            router.replace('/activate');
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Connection status */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Fleet Data Source</Text>
        <View style={[styles.card, hasBakedToken && styles.cardConnected]}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, hasBakedToken ? styles.dotGreen : styles.dotAmber]} />
            <Text style={[styles.statusText, hasBakedToken ? styles.statusTextGreen : styles.statusTextAmber]}>
              {hasBakedToken ? 'Connected to Wialon' : 'Demo Mode'}
            </Text>
          </View>
          <Text style={styles.statusDesc}>
            {hasBakedToken
              ? 'Live GPS data is streaming from your Wialon account via the Teltonika FMC130 trackers.'
              : 'Showing simulated demo data for 6 vehicles. Contact MDA to activate a live build.'}
          </Text>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.aboutCard}>
          <InfoRow label="App" value="Fleet Tracker" />
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Platform" value="Wialon + Teltonika FMC130" />
          <InfoRow label="Built by" value="MDA / DREXONYX" />
          <InfoRow label="Support" value="info@drexonyx.com" />
        </View>
      </View>

      {/* Account */}
      {session && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.aboutCard}>
            <InfoRow label="Name"    value={session.name} />
            <InfoRow label="Email"   value={session.email} />
            <InfoRow label="Company" value={session.company} />
          </View>
          <Pressable
            style={styles.btnSignOut}
            onPress={() =>
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out', style: 'destructive',
                  onPress: async () => {
                    await signOut();
                    qc.clear();
                    router.replace('/login');
                  },
                },
              ])
            }
          >
            <Text style={styles.btnSignOutText}>Sign Out</Text>
          </Pressable>
        </View>
      )}

      {/* License */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>License</Text>
        <View style={styles.aboutCard}>
          <InfoRow label="Status" value={devMode ? 'Dev / Demo' : 'Activated'} />
        </View>
        {!devMode && (
          <Pressable style={styles.btnDanger} onPress={handleRevokeLicense}>
            <Text style={styles.btnDangerText}>Remove Activation Key</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c' },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
    textTransform: 'uppercase', color: '#505060',
  },
  card: {
    backgroundColor: '#111116', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8,
  },
  cardConnected: { borderColor: 'rgba(16,185,129,0.25)' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: '#10b981' },
  dotAmber: { backgroundColor: '#C8980A' },
  statusText: { fontSize: 14, fontWeight: '700' },
  statusTextGreen: { color: '#10b981' },
  statusTextAmber: { color: '#C8980A' },
  statusDesc: { fontSize: 13, color: '#808090', lineHeight: 19 },
  aboutCard: {
    backgroundColor: '#111116', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  infoRowLabel: { fontSize: 13, color: '#505060' },
  infoRowValue: { fontSize: 13, fontWeight: '600', color: '#a0a0b0' },
  btnDanger: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10, paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  btnDangerText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
  btnSignOut: {
    backgroundColor: 'rgba(200,152,10,0.08)',
    borderRadius: 10, paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(200,152,10,0.2)',
  },
  btnSignOutText: { fontSize: 14, fontWeight: '700', color: '#C8980A' },
});
