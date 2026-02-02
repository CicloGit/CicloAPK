import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface ItemInput {
  name: string;
  category: string;
  unit: string;
  price?: number;
  photoUrl?: string;
  minStock?: number;
  active?: boolean;
}

export const useItems = () =>
  useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data } = await apiClient.get('/items');
      return data;
    },
  });

export const useCreateItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ItemInput) => {
      const { data } = await apiClient.post('/items', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
};

export const useUpdateItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: ItemInput & { id: string }) => {
      const { data } = await apiClient.patch(`/items/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
};

export const useDeleteItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/items/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
};
