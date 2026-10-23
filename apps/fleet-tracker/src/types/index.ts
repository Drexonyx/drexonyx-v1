export type VehicleStatus = 'moving' | 'parked' | 'offline';

export interface Vehicle {
  id: string;
  name: string;
  plateNumber: string;
  status: VehicleStatus;
  speed: number;       // km/h
  odometer: number;    // km total
  lat: number;
  lng: number;
  heading: number;     // degrees 0-360
  lastUpdate: Date;
  driver?: string;
  model?: string;
}

export interface TripPoint {
  lat: number;
  lng: number;
  speed: number;
  timestamp: Date;
}

export interface Trip {
  id: string;
  vehicleId: string;
  startTime: Date;
  endTime: Date;
  distance: number;    // km
  duration: number;    // minutes
  startAddress?: string;
  endAddress?: string;
  points: TripPoint[];
}

export interface MileageReport {
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export interface WialonConfig {
  token: string;
  baseUrl?: string;
}
