import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List, Searchbar, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { AppCard } from '../../ui/AppCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { StatusPill } from '../../ui/StatusPill';
import { AppButton } from '../../ui/AppButton';
import { palette, spacing, typography } from '../../theme';
import { useItems, useDeleteItem } from '../../api/hooks/items';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { EmptyState } from '../../ui/EmptyState';

export const AdminItems = () => {
  const navigation = useNavigation<any>();
  const { data, isLoading, refetch } = useItems();
  const { mutateAsync: deleteItem } = useDeleteItem();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list.filter((item: any) => {
      const matchesQuery =
        !query ||
        item.name?.toLowerCase().includes(query.toLowerCase()) ||
        item.category?.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [data, query, categoryFilter]);

  return (
    <View style={styles.container}>
      <SectionHeader title="Itens de estoque" />
      <Searchbar
        placeholder="Buscar por nome ou categoria"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />
      <AppCard>
        {isLoading ? (
          <>
            <SkeletonLoader width={200} />
            <SkeletonLoader width={180} />
          </>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item: any) => item.id}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: palette.gray200 }} />}
            renderItem={({ item }: any) => (
              <List.Item
                title={item.name}
                description={`${item.category} • ${item.unit}`}
                right={() => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <StatusPill
                      label={item.active === false ? 'Inativo' : 'Ativo'}
                      status={item.active === false ? 'warning' : 'success'}
                    />
                  </View>
                )}
                onPress={() => navigation.navigate('AdminItemForm', { id: item.id, item })}
                onLongPress={() => deleteItem(item.id)}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                title="Sem itens"
                description="Cadastre insumos para que clientes possam solicitar."
                ctaLabel="Adicionar item"
                onPressCta={() => navigation.navigate('AdminItemForm')}
              />
            }
            refreshing={isLoading}
            onRefresh={refetch}
          />
        )}
      </AppCard>
      <AppButton label="Adicionar item" onPress={() => navigation.navigate('AdminItemForm')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
    padding: spacing.lg,
    gap: spacing.md,
  },
  search: {
    marginBottom: spacing.sm,
  },
});
