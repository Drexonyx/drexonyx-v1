/**
 * License key system.
 *
 * Key format:  FT-XXXXXX-CCCC
 *   XXXXXX = 6 alphanumeric chars (client identifier, chosen by MDA)
 *   CCCC   = first 4 chars of SHA-256(LICENSE_SECRET + "FT-" + XXXXXX)
 *
 * MDA generates keys with:  node tools/generate-license-key.js <client-id>
 * The LICENSE_SECRET is set as an EAS secret and baked into the app build.
 *
 * In dev/demo mode (no LICENSE_SECRET set) the app is always unlocked.
 */

import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const STORE_KEY = 'fleet_license_key';
const DEV_SECRET = 'dev-mode-no-secret';

function getSecret(): string {
  return (Constants.expoConfig?.extra?.licenseSecret as string) ?? DEV_SECRET;
}

export function isDevMode(): boolean {
  return getSecret() === DEV_SECRET;
}

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function validateKey(key: string): Promise<boolean> {
  if (isDevMode()) return true;

  const normalized = key.trim().toUpperCase();
  const match = normalized.match(/^FT-([A-Z0-9]{6})-([A-Z0-9]{4})$/);
  if (!match) return false;

  const [, clientId, checksum] = match;
  const secret = getSecret();
  const hash = await sha256Hex(secret + 'FT-' + clientId);
  const expected = hash.slice(0, 4).toUpperCase();

  return expected === checksum;
}

export async function saveKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEY, key.trim().toUpperCase());
}

export async function getStoredKey(): Promise<string | null> {
  return SecureStore.getItemAsync(STORE_KEY);
}

export async function isActivated(): Promise<boolean> {
  if (isDevMode()) return true;
  const stored = await getStoredKey();
  if (!stored) return false;
  return validateKey(stored);
}

export async function revoke(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_KEY);
}
