import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  fetchVehicles, fetchVehicle, fetchTrips, fetchMileageReports,
  addVehicle, updateVehicle, deleteVehicle,
  type VehicleFormData,
} from '../services/wialon';

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

export function useAddVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: VehicleFormData) => addVehicle(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleFormData> }) =>
      updateVehicle(id, data),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['vehicle', id] });
    },
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}
