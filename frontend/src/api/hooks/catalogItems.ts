import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export const useSupplierItems = () =>
  useQuery({
    queryKey: ['supplier_items'],
    queryFn: async () => {
      const { data } = await apiClient.get('/supplier-items');
      return data;
    },
  });

export const useUpdateSupplierItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data } = await apiClient.patch(`/supplier-items/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier_items'] }),
  });
};
