/**
 * Wialon API service.
 *
 * The Wialon token is injected at EAS build time via the WIALON_TOKEN secret
 * (app.config.js → extra.wialonToken). The client never sees or enters it.
 *
 * When no token is baked in (dev/demo builds) the service returns mock data.
 *
 * Docs: https://sdk.wialon.com/wiki/en/kit/remoteapi/apiref/apiref
 */

import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Vehicle, Trip, MileageReport } from '../types';
import {
  getMockVehicles,
  getMockVehicle,
  getMockTrips,
  getMockMileageReports,
} from './mock-data';

const WIALON_BASE = 'https://hst-api.wialon.com/wialon/ajax.do';
const SESSION_KEY = 'wialon_session_id';

function getBakedToken(): string {
  return (Constants.expoConfig?.extra?.wialonToken as string) ?? '';
}

let _sessionId: string | null = null;
let _useMock = true;

// ─── Token management (internal — not exposed to client UI) ───

// ─── Wialon session ────────────────────────────────────────

async function wialonRequest<T>(params: Record<string, unknown>): Promise<T> {
  const body = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    body.append(key, typeof val === 'string' ? val : JSON.stringify(val));
  }
  const res = await fetch(WIALON_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json();
  if (json.error) throw new Error(`Wialon error ${json.error}`);
  return json as T;
}

async function ensureSession(): Promise<string> {
  if (_sessionId) return _sessionId;

  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (stored) {
    _sessionId = stored;
    return _sessionId;
  }

  const token = getBakedToken();
  if (!token) throw new Error('No Wialon token configured in this build');

  const resp = await wialonRequest<{ eid: string }>({
    svc: 'token/login',
    params: JSON.stringify({ token }),
  });

  _sessionId = resp.eid;
  await SecureStore.setItemAsync(SESSION_KEY, _sessionId);
  return _sessionId;
}

// ─── Public API ────────────────────────────────────────────

export function initService(): void {
  _useMock = !getBakedToken();
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  if (_useMock) return getMockVehicles();

  const sid = await ensureSession();

  type WialonUnit = {
    id: number;
    nm: string;
    pos?: { x: number; y: number; s: number; c: number; t: number };
    prms?: { odometer?: { v: number } };
  };

  const resp = await wialonRequest<{ items: WialonUnit[] }>({
    svc: 'core/search_items',
    params: JSON.stringify({
      spec: {
        itemsType: 'avl_unit',
        propName: 'sys_name',
        propValueMask: '*',
        sortType: 'sys_name',
      },
      force: 1,
      flags: 0x00000001 | 0x00000100 | 0x00000008,
      from: 0,
      to: 0,
    }),
    sid,
  });

  return resp.items.map(u => {
    const pos = u.pos;
    const status = !pos ? 'offline' : pos.s > 0 ? 'moving' : 'parked';
    return {
      id: String(u.id),
      name: u.nm,
      plateNumber: u.nm,
      status: status as Vehicle['status'],
      speed: pos?.s ?? 0,
      odometer: (u.prms?.odometer?.v ?? 0) / 1000,
      lat: pos?.y ?? 0,
      lng: pos?.x ?? 0,
      heading: pos?.c ?? 0,
      lastUpdate: pos ? new Date(pos.t * 1000) : new Date(0),
    };
  });
}

export async function fetchVehicle(id: string): Promise<Vehicle | undefined> {
  if (_useMock) return getMockVehicle(id);
  const all = await fetchVehicles();
  return all.find(v => v.id === id);
}

export async function fetchTrips(vehicleId: string, from: Date, to: Date): Promise<Trip[]> {
  if (_useMock) return getMockTrips(vehicleId);

  const sid = await ensureSession();

  type WialonMessage = { pos?: { x: number; y: number; s: number; t: number } };

  const resp = await wialonRequest<{ messages: WialonMessage[] }>({
    svc: 'messages/load_interval',
    params: JSON.stringify({
      itemId: parseInt(vehicleId),
      timeFrom: Math.floor(from.getTime() / 1000),
      timeTo: Math.floor(to.getTime() / 1000),
      flags: 0x0001,
      flagsMask: 0xff00,
      loadCount: 0xffffffff,
    }),
    sid,
  });

  if (!resp.messages?.length) return [];

  const points = resp.messages
    .filter(m => m.pos)
    .map(m => ({
      lat: m.pos!.y,
      lng: m.pos!.x,
      speed: m.pos!.s,
      timestamp: new Date(m.pos!.t * 1000),
    }));

  if (!points.length) return [];

  let totalDist = 0;
  for (let i = 1; i < points.length; i++) {
    totalDist += haversine(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
  }

  const dur = Math.round((points[points.length - 1].timestamp.getTime() - points[0].timestamp.getTime()) / 60000);

  return [{
    id: `${vehicleId}-${from.getTime()}`,
    vehicleId,
    startTime: points[0].timestamp,
    endTime: points[points.length - 1].timestamp,
    distance: parseFloat(totalDist.toFixed(1)),
    duration: dur,
    points,
  }];
}

export async function fetchMileageReports(): Promise<MileageReport[]> {
  if (_useMock) return getMockMileageReports();
  const vehicles = await fetchVehicles();
  return vehicles.map(v => ({
    vehicleId: v.id,
    vehicleName: v.name,
    plateNumber: v.plateNumber,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  }));
}

// ─── Utils ─────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
