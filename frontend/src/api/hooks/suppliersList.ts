import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export const useSuppliersList = () =>
  useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/suppliers');
      return data;
    },
  });
