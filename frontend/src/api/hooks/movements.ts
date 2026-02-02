import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export const useMovements = (itemId?: string) =>
  useQuery({
    queryKey: ['movements', itemId],
    queryFn: async () => {
      const { data } = await apiClient.get('/stock-movements', { params: itemId ? { itemId } : {} });
      return data;
    },
  });
