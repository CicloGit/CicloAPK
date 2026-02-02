import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface CreateRequestInput {
  lines: { catalogItemId: string; qty: number }[];
  notes?: string;
  scheduleAt?: string;
}

export const useRequests = (scope?: 'mine') =>
  useQuery({
    queryKey: ['requests', scope],
    queryFn: async () => {
      const { data } = await apiClient.get('/requests', { params: scope ? { scope } : {} });
      return data;
    },
  });

export const useCreateRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRequestInput) => {
      const { data } = await apiClient.post('/requests', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['requests', 'mine'] });
    },
  });
};

export const useUpdateRequestStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await apiClient.patch(`/requests/${id}/status`, { status, requestId: id });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  });
};
