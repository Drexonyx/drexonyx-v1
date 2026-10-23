import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchVehicles, fetchVehicle, fetchTrips, fetchMileageReports } from '../services/wialon';

export function useVehicles() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  useEffect(() => {
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
    }, 10_000);
    return () => clearInterval(id);
  }, [qc]);

  return query;
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => fetchVehicle(id),
    refetchInterval: 10_000,
    enabled: !!id,
  });
}

export function useTrips(vehicleId: string, from: Date, to: Date) {
  return useQuery({
    queryKey: ['trips', vehicleId, from.toDateString(), to.toDateString()],
    queryFn: () => fetchTrips(vehicleId, from, to),
    enabled: !!vehicleId,
  });
}

export function useMileageReports() {
  return useQuery({
    queryKey: ['mileage'],
    queryFn: fetchMileageReports,
    refetchInterval: 60_000,
  });
}
