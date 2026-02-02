import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface SupplierInput {
  name: string;
  email?: string;
  contact?: string;
  items?: string[];
}

export const useSuppliers = () =>
  useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/suppliers');
      return data;
    },
  });

export const useCreateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SupplierInput) => {
      const { data } = await apiClient.post('/suppliers', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
};
