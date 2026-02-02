import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export const useStockBalances = (supplierId?: string) =>
  useQuery({
    queryKey: ['stock_balances', supplierId],
    queryFn: async () => {
      const { data } = await apiClient.get('/stock-balances', { params: supplierId ? { supplierId } : {} });
      return data;
    },
  });

export const useCreateMovement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/stock-balances/move', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock_balances'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
    },
  });
};
