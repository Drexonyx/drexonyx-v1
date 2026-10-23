import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { validateKey, saveKey } from '../src/services/license';

export default function ActivateScreen() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleActivate() {
    const normalized = key.trim().toUpperCase();
    setError('');

    if (!normalized) {
      setError('Please enter your activation key.');
      return;
    }

    setLoading(true);
    try {
      const valid = await validateKey(normalized);
      if (!valid) {
        setError('Invalid key. Please check the key and try again.');
        return;
      }
      await saveKey(normalized);
      router.replace('/(tabs)/map');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconEmoji}>🚗</Text>
          </View>
          <Text style={styles.appName}>Fleet Tracker</Text>
          <Text style={styles.byLine}>by MDA / DREXONYX</Text>
        </View>

        {/* Activation card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activate Your License</Text>
          <Text style={styles.cardDesc}>
            Enter the activation key you received from MDA after completing your purchase.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="FT-XXXXXX-XXXX"
              placeholderTextColor="#404050"
              value={key}
              onChangeText={t => { setKey(t); setError(''); }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleActivate}
              editable={!loading}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.btn, (!key.trim() || loading) && styles.btnDisabled]}
            onPress={handleActivate}
            disabled={!key.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.btnText}>Activate</Text>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have a key?{' '}
          </Text>
          <Text style={styles.footerContact}>Contact info@drexonyx.com</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0a0a0c' },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 32,
  },
  logoArea: { alignItems: 'center', gap: 8 },
  appIcon: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#111116',
    borderWidth: 1, borderColor: 'rgba(200,152,10,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  appIconEmoji: { fontSize: 40 },
  appName: { fontSize: 26, fontWeight: '900', color: '#f0f0f4', letterSpacing: -0.5 },
  byLine: { fontSize: 12, color: '#505060', fontWeight: '500', letterSpacing: 0.3 },

  card: {
    width: '100%',
    backgroundColor: '#111116',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    gap: 14,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#f0f0f4', textAlign: 'center' },
  cardDesc: { fontSize: 13, color: '#a0a0b0', textAlign: 'center', lineHeight: 20 },

  inputWrapper: {},
  input: {
    backgroundColor: '#0d0d14',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, padding: 14,
    color: '#f0f0f4',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  inputError: { borderColor: 'rgba(239,68,68,0.5)' },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  errorText: { fontSize: 13, color: '#ef4444' },

  btn: {
    backgroundColor: '#C8980A',
    borderRadius: 10, paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.3 },

  footer: { alignItems: 'center', gap: 2 },
  footerText: { fontSize: 12, color: '#505060' },
  footerContact: { fontSize: 12, color: '#C8980A', fontWeight: '600' },
});
