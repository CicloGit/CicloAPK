import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export const useCatalog = (publishedOnly = false) =>
  useQuery({
    queryKey: ['catalog', publishedOnly],
    queryFn: async () => {
      const { data } = await apiClient.get('/catalog', { params: publishedOnly ? { published: true } : {} });
      return data;
    },
  });

export const useUpdateCatalogItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; [k: string]: any }) => {
      const { data } = await apiClient.patch(`/catalog/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
};
