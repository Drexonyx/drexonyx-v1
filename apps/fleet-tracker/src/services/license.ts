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

// Pure JS SHA-256 — no native crypto.subtle needed in React Native
function sha256Hex(data: string): Promise<string> {
  // Try Web Crypto first (Hermes 0.73+), fall back to pure JS
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    return crypto.subtle.digest('SHA-256', encoder.encode(data)).then(buf =>
      Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    );
  }
  return Promise.resolve(pureJsSha256(data));
}

// Minimal pure-JS SHA-256 (FIPS 180-4)
function pureJsSha256(msg: string): string {
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ];
  const bytes: number[] = [];
  for (let i = 0; i < msg.length; i++) {
    const c = msg.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) { bytes.push(0xc0|(c>>6)); bytes.push(0x80|(c&0x3f)); }
    else { bytes.push(0xe0|(c>>12)); bytes.push(0x80|((c>>6)&0x3f)); bytes.push(0x80|(c&0x3f)); }
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push((bitLen / Math.pow(2, i * 8)) & 0xff);
  let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  for (let i = 0; i < bytes.length; i += 64) {
    const w: number[] = [];
    for (let j = 0; j < 16; j++) w.push((bytes[i+j*4]<<24)|(bytes[i+j*4+1]<<16)|(bytes[i+j*4+2]<<8)|bytes[i+j*4+3]);
    for (let j = 16; j < 64; j++) {
      const s0 = ((w[j-15]>>>7)|(w[j-15]<<25))^((w[j-15]>>>18)|(w[j-15]<<14))^(w[j-15]>>>3);
      const s1 = ((w[j-2]>>>17)|(w[j-2]<<15))^((w[j-2]>>>19)|(w[j-2]<<13))^(w[j-2]>>>10);
      w.push((w[j-16]+s0+w[j-7]+s1)>>>0);
    }
    let [a,b,c,d,e,f,g,hh] = h;
    for (let j = 0; j < 64; j++) {
      const S1 = ((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));
      const ch = (e&f)^(~e&g);
      const temp1 = (hh+S1+ch+K[j]+w[j])>>>0;
      const S0 = ((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));
      const maj = (a&b)^(a&c)^(b&c);
      const temp2 = (S0+maj)>>>0;
      hh=g; g=f; f=e; e=(d+temp1)>>>0; d=c; c=b; b=a; a=(temp1+temp2)>>>0;
    }
    h = h.map((v,i) => ([a,b,c,d,e,f,g,hh][i]+v)>>>0);
  }
  return h.map(v => v.toString(16).padStart(8,'0')).join('');
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
  // Some MIUI devices hang on KeyStore — bail after 3 s
  return Promise.race([
    SecureStore.getItemAsync(STORE_KEY),
    new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
  ]);
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
