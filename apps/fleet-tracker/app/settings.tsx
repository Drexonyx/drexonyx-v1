import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { saveToken, clearToken, getToken } from '../src/services/wialon';

export default function SettingsScreen() {
  const qc = useQueryClient();
  const [token, setToken] = useState('');
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  useEffect(() => {
    getToken().then(t => {
      setCurrentToken(t);
    });
  }, []);

  async function handleSave() {
    if (!token.trim()) return;
    setSaving(true);
    try {
      await saveToken(token.trim());
      setCurrentToken(token.trim());
      setToken('');
      setMode('view');
      qc.invalidateQueries();
      Alert.alert('✅ Connected', 'Wialon API token saved. Fleet data will now load from your account.');
    } catch {
      Alert.alert('Error', 'Failed to save token. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    Alert.alert(
      'Disconnect Wialon',
      'This will remove your API token and switch back to demo mode. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await clearToken();
            setCurrentToken(null);
            qc.invalidateQueries();
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Wialon connection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Wialon API Connection</Text>

        {currentToken ? (
          <View style={styles.connectedCard}>
            <View style={styles.connectedRow}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>Connected to Wialon</Text>
            </View>
            <Text style={styles.tokenMasked}>
              Token: ****{currentToken.slice(-8)}
            </Text>
            {mode === 'view' ? (
              <View style={styles.connectedActions}>
                <Pressable style={styles.btnSecondary} onPress={() => setMode('edit')}>
                  <Text style={styles.btnSecondaryText}>Change Token</Text>
                </Pressable>
                <Pressable style={styles.btnDanger} onPress={handleDisconnect}>
                  <Text style={styles.btnDangerText}>Disconnect</Text>
                </Pressable>
              </View>
            ) : (
              <TokenInput
                token={token}
                setToken={setToken}
                saving={saving}
                onSave={handleSave}
                onCancel={() => setMode('view')}
              />
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connect Your Wialon Account</Text>
            <Text style={styles.cardDesc}>
              Enter your Wialon API token to load live data from your fleet. You can generate a token in your Wialon dashboard under{' '}
              <Text style={styles.highlight}>User Settings → API Tokens</Text>.
            </Text>
            <TokenInput
              token={token}
              setToken={setToken}
              saving={saving}
              onSave={handleSave}
            />
          </View>
        )}
      </View>

      {/* Demo mode info */}
      {!currentToken && (
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🧪</Text>
          <Text style={styles.infoTitle}>Demo Mode Active</Text>
          <Text style={styles.infoText}>
            The app is currently showing realistic demo data for 6 vehicles in Dubai. Connect your Wialon account to see your real fleet.
          </Text>
        </View>
      )}

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.aboutCard}>
          <InfoRow label="App" value="Fleet Tracker" />
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Platform" value="Wialon + Teltonika FMC130" />
          <InfoRow label="Built by" value="MDA / DREXONYX" />
        </View>
      </View>
    </ScrollView>
  );
}

function TokenInput({
  token, setToken, saving, onSave, onCancel,
}: {
  token: string;
  setToken: (t: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel?: () => void;
}) {
  return (
    <View style={styles.tokenForm}>
      <TextInput
        style={styles.tokenInput}
        placeholder="Paste your Wialon API token…"
        placeholderTextColor="#505060"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={false}
        multiline={false}
      />
      <View style={styles.tokenActions}>
        {onCancel && (
          <Pressable style={styles.btnSecondary} onPress={onCancel}>
            <Text style={styles.btnSecondaryText}>Cancel</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.btnPrimary, (!token.trim() || saving) && styles.btnDisabled, onCancel ? styles.btnFlex : null]}
          onPress={onSave}
          disabled={!token.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.btnPrimaryText}>Connect</Text>
          )}
        </Pressable>
      </View>
    </View>
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
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
    textTransform: 'uppercase', color: '#505060', marginTop: 4, marginBottom: 4,
  },
  card: {
    backgroundColor: '#111116', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#f0f0f4' },
  cardDesc: { fontSize: 13, color: '#a0a0b0', lineHeight: 20 },
  highlight: { color: '#C8980A', fontWeight: '600' },
  connectedCard: {
    backgroundColor: '#111116', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', gap: 10,
  },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectedDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981',
  },
  connectedText: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  tokenMasked: { fontSize: 12, color: '#606070', fontFamily: 'monospace' as any },
  connectedActions: { flexDirection: 'row', gap: 10 },
  tokenForm: { gap: 10 },
  tokenInput: {
    backgroundColor: '#0d0d14', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8, padding: 12, color: '#f0f0f4', fontSize: 13,
    fontFamily: 'monospace' as any,
  },
  tokenActions: { flexDirection: 'row', gap: 10 },
  btnPrimary: {
    flex: 1, backgroundColor: '#C8980A', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center',
  },
  btnFlex: { flex: 2 },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#000' },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8,
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 13, fontWeight: '600', color: '#a0a0b0' },
  btnDanger: {
    backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 8,
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
  },
  btnDangerText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },
  btnDisabled: { opacity: 0.4 },
  infoCard: {
    backgroundColor: 'rgba(200,152,10,0.08)',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(200,152,10,0.2)',
    gap: 6, alignItems: 'center',
  },
  infoIcon: { fontSize: 28 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#C8980A' },
  infoText: { fontSize: 13, color: '#a07808', textAlign: 'center', lineHeight: 19 },
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
});
