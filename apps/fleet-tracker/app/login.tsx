import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signIn } from '../src/services/auth';
import appIcon from '../assets/icon.png';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)/map');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail('demo@fleettracker.com');
    setPassword('demo1234');
    setError('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.iconWrapper}>
            <Image
              source={appIcon}
              style={styles.iconImg}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>FLEET TRACKER</Text>
          <Text style={styles.byLine}>Real-time vehicle monitoring</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="you@company.com"
              placeholderTextColor="#404050"
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, styles.passInput, error ? styles.inputError : null]}
                placeholder="••••••••"
                placeholderTextColor="#404050"
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPass(p => !p)}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          {/* Sign In button */}
          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Demo mode */}
        <Pressable style={styles.demoBtn} onPress={fillDemo}>
          <Text style={styles.demoText}>Use demo credentials</Text>
        </Pressable>

        {/* Footer */}
        <Text style={styles.footer}>
          Need access? Contact{' '}
          <Text style={styles.footerLink}>info@drexonyx.com</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#05050a' },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 28,
  },

  logoArea: { alignItems: 'center', gap: 10 },
  iconWrapper: {
    width: 100, height: 100,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(200,152,10,0.35)',
    shadowColor: '#C8980A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  iconImg: { width: 100, height: 100 },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f0f0f4',
    letterSpacing: 3,
    marginTop: 4,
  },
  byLine: { fontSize: 12, color: '#C8980A', fontWeight: '500', letterSpacing: 0.5 },

  card: {
    width: '100%',
    backgroundColor: '#0e0e14',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(200,152,10,0.15)',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f0f0f4',
    textAlign: 'center',
    marginBottom: 4,
  },

  fieldGroup: { gap: 6 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C8980A',
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: '#08080f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f0f0f4',
    fontSize: 15,
    flex: 1,
  },
  inputError: { borderColor: 'rgba(239,68,68,0.4)' },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passInput: { flex: 1 },
  eyeBtn: {
    padding: 14,
    backgroundColor: '#08080f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  eyeText: { fontSize: 16 },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },

  btn: {
    backgroundColor: '#C8980A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#C8980A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#000', letterSpacing: 0.5 },

  demoBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(200,152,10,0.2)',
  },
  demoText: { fontSize: 13, color: '#606070', fontWeight: '600' },

  footer: { fontSize: 11, color: '#404050', textAlign: 'center' },
  footerLink: { color: '#C8980A' },
});
