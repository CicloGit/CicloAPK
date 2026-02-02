import React, { useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, View } from 'react-native';
import { List, SegmentedButtons } from 'react-native-paper';
import { useStockBalances } from '../../api/hooks/stock';
import { useSuppliersList } from '../../api/hooks/suppliersList';
import { AppCard } from '../../ui/AppCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { StatusPill } from '../../ui/StatusPill';
import { palette, spacing } from '../../theme';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { EmptyState } from '../../ui/EmptyState';

export const AdminStock = () => {
  const [supplierId, setSupplierId] = useState('');
  const { data, isLoading, refetch } = useStockBalances(supplierId || undefined);
  const { data: suppliers } = useSuppliersList();
  const balances = data ?? [];

  const list = useMemo(() => balances, [balances]);

  return (
    <SafeAreaView style={styles.container}>
      <SectionHeader title="Disponibilidade por fornecedor" />
      <SegmentedButtons
        value={supplierId}
        onValueChange={setSupplierId}
        buttons={[
          { value: '', label: 'Todos' },
          ...(suppliers ?? []).slice(0, 4).map((s: any) => ({
            value: s.id || s.supplierId,
            label: s.name || s.id || 'supplier',
          })),
        ]}
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
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: palette.gray200 }} />}
            renderItem={({ item }: any) => (
              <List.Item
                title={`${item.supplierItemId} (${item.supplierId})`}
                description={`Min ${item.minStock ?? 0}`}
                right={() => (
                  <View style={{ alignItems: 'flex-end' }}>
                    <StatusPill
                      label={`Disp: ${item.available ?? 0}`}
                      status={item.lowStock ? 'warning' : 'success'}
                    />
                    <StatusPill label={`Res: ${item.reserved ?? 0}`} status="info" />
                  </View>
                )}
              />
            )}
            ListEmptyComponent={<EmptyState title="Sem dados" description="Nenhum saldo encontrado." />}
            refreshing={isLoading}
            onRefresh={refetch}
          />
        )}
      </AppCard>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.white, padding: spacing.lg },
});
