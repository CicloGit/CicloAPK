import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List, SegmentedButtons } from 'react-native-paper';
import { AppCard } from '../../ui/AppCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { StatusPill } from '../../ui/StatusPill';
import { palette, spacing } from '../../theme';
import { useMovements } from '../../api/hooks/movements';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { EmptyState } from '../../ui/EmptyState';

const TYPES = ['ALL', 'IN', 'OUT', 'RESERVE', 'RELEASE', 'ADJUST'];

export const AdminMovements = () => {
  const { data, isLoading, refetch } = useMovements();
  const [filter, setFilter] = useState('ALL');

  const list = (data ?? []).filter((m: any) => (filter === 'ALL' ? true : m.type === filter));

  return (
    <View style={styles.container}>
      <SectionHeader title="Movimentacoes" />
      <SegmentedButtons
        value={filter}
        onValueChange={setFilter}
        buttons={TYPES.map((t) => ({ value: t, label: t }))}
        style={{ marginBottom: spacing.sm }}
      />
      <AppCard>
        {isLoading ? (
          <>
            <SkeletonLoader width={220} />
            <SkeletonLoader width={200} />
          </>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }: any) => (
              <List.Item
                title={`${item.itemNameSnapshot || item.itemId} - ${item.type}`}
                description={`Qtd ${item.qty} • ${new Date(item.createdAt).toLocaleString()}`}
                right={() => <StatusPill label={item.type} status="info" />}
              />
            )}
            ListEmptyComponent={<EmptyState title="Sem movimentos" description="Nenhum movimento registrado." />}
            refreshing={isLoading}
            onRefresh={refetch}
          />
        )}
      </AppCard>
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
});
