import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'fleet_auth_session';

// Demo credentials — replace with real API when client goes live
const DEMO_USERS: Record<string, { password: string; name: string; company: string }> = {
  'demo@fleettracker.com': { password: 'demo1234', name: 'Demo Admin', company: 'Demo Company' },
  'admin@fleet.com':       { password: 'admin123', name: 'Fleet Admin', company: 'Your Company' },
};

export interface AuthSession {
  email: string;
  name: string;
  company: string;
  token: string;
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = DEMO_USERS[normalizedEmail];

  if (!user || user.password !== password.trim()) {
    throw new Error('Invalid email or password.');
  }

  const session: AuthSession = {
    email: normalizedEmail,
    name: user.name,
    company: user.company,
    token: `ft_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  };

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
