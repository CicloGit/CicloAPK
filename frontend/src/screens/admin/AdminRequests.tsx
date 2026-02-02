import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List, SegmentedButtons, Text } from 'react-native-paper';
import { AppCard } from '../../ui/AppCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { StatusPill } from '../../ui/StatusPill';
import { palette, spacing, typography } from '../../theme';
import { useRequests, useUpdateRequestStatus } from '../../api/hooks/requests';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { EmptyState } from '../../ui/EmptyState';
import { useStockBalances } from '../../api/hooks/stock';
import { Alert } from 'react-native';
import { Snackbar } from 'react-native-paper';

const statusOrder = ['PENDING', 'APPROVED', 'IN_PROGRESS', 'DELIVERED', 'CANCELED'];

export const AdminRequests = () => {
  const { data, isLoading, refetch } = useRequests();
  const { mutateAsync: updateStatus } = useUpdateRequestStatus();
  const { data: balances } = useStockBalances();
  const [filter, setFilter] = useState<string>('PENDING');
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const filtered = (data ?? []).filter((r: any) => (filter ? r.status === filter : true));

  const availableByItem = useMemo(() => {
    const map: Record<string, number> = {};
    (balances ?? []).forEach((b: any) => {
      map[b.supplierItemId] = b.available ?? 0;
    });
    return map;
  }, [balances]);

  const canApprove = (req: any) => {
    return (req.lines || []).every((line: any) => (availableByItem[line.supplierItemId] ?? 0) >= line.qty);
  };

  return (
    <View style={styles.container}>
      <SectionHeader title="Solicitacoes (Inbox)" />
      <SegmentedButtons
        value={filter}
        onValueChange={setFilter}
        buttons={statusOrder.map((s) => ({ value: s, label: s }))}
        style={{ marginBottom: spacing.sm }}
      />
      <AppCard>
        {isLoading ? (
          <>
            <SkeletonLoader width={200} />
            <SkeletonLoader width={220} />
          </>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item: any) => item.id}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: palette.gray200 }} />}
            renderItem={({ item }: any) => (
              <List.Item
                title={`${item.lines?.length || 0} itens`}
                description={item.status}
                right={() => (
                  <StatusPill
                    label={item.status}
                    status={
                      item.status === 'DELIVERED'
                        ? 'success'
                        : item.status === 'PENDING'
                          ? 'warning'
                          : 'info'
                    }
                  />
                )}
                onPress={() => {
                  const next = nextStatus(item.status);
                  if (!next) return;
                  if (next === 'APPROVED' && !canApprove(item)) {
                    Alert.alert('Estoque insuficiente', 'Nao ha saldo disponivel para aprovar esta solicitacao.');
                    return;
                  }
                  updateStatus({ id: item.id, status: next }).then(() =>
                    setToast({ visible: true, message: `Status alterado para ${next}` }),
                  );
                }}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                title="Nada por aqui"
                description="Nenhuma solicitacao para este status."
              />
            }
            refreshing={isLoading}
            onRefresh={refetch}
          />
        )}
      </AppCard>
      <Snackbar visible={toast.visible} onDismiss={() => setToast({ visible: false, message: '' })} duration={1500}>
        {toast.message}
      </Snackbar>
    </View>
  );
};

function nextStatus(status: string) {
  const idx = statusOrder.indexOf(status);
  if (idx === -1 || idx === statusOrder.length - 1) return null;
  return statusOrder[idx + 1];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
