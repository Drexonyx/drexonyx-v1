import { Vehicle, Trip, MileageReport } from '../types';

// Dubai-area coordinates for realistic mock data
const DUBAI_VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    name: 'Toyota Hilux #01',
    plateNumber: 'Dubai A 12345',
    status: 'moving',
    speed: 68,
    odometer: 47320,
    lat: 25.2048,
    lng: 55.2708,
    heading: 45,
    lastUpdate: new Date(),
    driver: 'Ahmed Al Mansoori',
    model: 'Toyota Hilux 2023',
  },
  {
    id: 'v2',
    name: 'Ford F-150 #02',
    plateNumber: 'Dubai B 54321',
    status: 'parked',
    speed: 0,
    odometer: 32100,
    lat: 25.1972,
    lng: 55.2796,
    heading: 0,
    lastUpdate: new Date(Date.now() - 8 * 60 * 1000),
    driver: 'Khalid Al Rashidi',
    model: 'Ford F-150 2022',
  },
  {
    id: 'v3',
    name: 'Mitsubishi L200 #03',
    plateNumber: 'Dubai C 98765',
    status: 'moving',
    speed: 42,
    odometer: 61500,
    lat: 25.2137,
    lng: 55.2647,
    heading: 270,
    lastUpdate: new Date(),
    driver: 'Mohammed Al Zaabi',
    model: 'Mitsubishi L200 2023',
  },
  {
    id: 'v4',
    name: 'Nissan Patrol #04',
    plateNumber: 'Dubai D 11223',
    status: 'offline',
    speed: 0,
    odometer: 89200,
    lat: 25.1877,
    lng: 55.2570,
    heading: 180,
    lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    driver: 'Omar Al Hamdan',
    model: 'Nissan Patrol 2021',
  },
  {
    id: 'v5',
    name: 'Toyota Land Cruiser #05',
    plateNumber: 'Dubai E 33445',
    status: 'moving',
    speed: 95,
    odometer: 28750,
    lat: 25.2200,
    lng: 55.2900,
    heading: 90,
    lastUpdate: new Date(),
    driver: 'Ali Al Nuaimi',
    model: 'Toyota Land Cruiser 2024',
  },
  {
    id: 'v6',
    name: 'RAM 1500 #06',
    plateNumber: 'Dubai F 55667',
    status: 'parked',
    speed: 0,
    odometer: 15300,
    lat: 25.1950,
    lng: 55.2850,
    heading: 90,
    lastUpdate: new Date(Date.now() - 25 * 60 * 1000),
    driver: 'Saeed Al Blooshi',
    model: 'RAM 1500 2023',
  },
];

let _vehicles = DUBAI_VEHICLES.map(v => ({ ...v }));
let _lastSimTime = Date.now();

function simulateMovement(): void {
  const now = Date.now();
  const dt = (now - _lastSimTime) / 1000;
  _lastSimTime = now;

  _vehicles = _vehicles.map(v => {
    if (v.status !== 'moving') return { ...v, lastUpdate: new Date() };

    const speedMs = (v.speed / 3600) * dt;
    const headingRad = (v.heading * Math.PI) / 180;
    const dlat = (speedMs * Math.cos(headingRad)) / 111320;
    const dlng = (speedMs * Math.sin(headingRad)) / (111320 * Math.cos((v.lat * Math.PI) / 180));

    let newHeading = v.heading + (Math.random() - 0.5) * 10;
    if (newHeading < 0) newHeading += 360;
    if (newHeading >= 360) newHeading -= 360;

    const newSpeed = Math.max(20, Math.min(120, v.speed + (Math.random() - 0.5) * 8));

    return {
      ...v,
      lat: v.lat + dlat,
      lng: v.lng + dlng,
      heading: newHeading,
      speed: Math.round(newSpeed),
      odometer: v.odometer + speedMs / 1000,
      lastUpdate: new Date(),
    };
  });
}

export function getMockVehicles(): Vehicle[] {
  simulateMovement();
  return _vehicles;
}

export function getMockVehicle(id: string): Vehicle | undefined {
  simulateMovement();
  return _vehicles.find(v => v.id === id);
}

function generateTripPoints(startLat: number, startLng: number, count: number): {
  lat: number; lng: number; speed: number; timestamp: Date;
}[] {
  const points = [];
  let lat = startLat;
  let lng = startLng;
  const startTime = new Date(Date.now() - count * 30 * 1000);

  for (let i = 0; i < count; i++) {
    lat += (Math.random() - 0.5) * 0.002;
    lng += (Math.random() - 0.5) * 0.002;
    points.push({
      lat,
      lng,
      speed: Math.round(30 + Math.random() * 70),
      timestamp: new Date(startTime.getTime() + i * 30 * 1000),
    });
  }
  return points;
}

export function getMockTrips(vehicleId: string): Trip[] {
  const vehicle = _vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return [];

  const trips: Trip[] = [];
  const today = new Date();

  for (let day = 0; day < 7; day++) {
    const tripCount = Math.floor(Math.random() * 3) + 1;
    for (let t = 0; t < tripCount; t++) {
      const startHour = 7 + t * 3 + Math.floor(Math.random() * 2);
      const startTime = new Date(today);
      startTime.setDate(today.getDate() - day);
      startTime.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);
      const duration = 15 + Math.floor(Math.random() * 90);
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
      const distance = parseFloat((duration * (40 + Math.random() * 40) / 60).toFixed(1));

      trips.push({
        id: `${vehicleId}-day${day}-trip${t}`,
        vehicleId,
        startTime,
        endTime,
        distance,
        duration,
        startAddress: 'Dubai Industrial Area',
        endAddress: 'Dubai Downtown',
        points: generateTripPoints(vehicle.lat, vehicle.lng, Math.floor(duration / 2)),
      });
    }
  }

  return trips.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

export function getMockMileageReports(): MileageReport[] {
  return _vehicles.map(v => ({
    vehicleId: v.id,
    vehicleName: v.name,
    plateNumber: v.plateNumber,
    today: parseFloat((20 + Math.random() * 180).toFixed(1)),
    thisWeek: parseFloat((150 + Math.random() * 850).toFixed(1)),
    thisMonth: parseFloat((600 + Math.random() * 3400).toFixed(1)),
  }));
}
