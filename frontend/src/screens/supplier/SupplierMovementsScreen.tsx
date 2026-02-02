import React, { useState } from 'react';
import { SafeAreaView, FlatList, StyleSheet } from 'react-native';
import { List, Snackbar } from 'react-native-paper';
import { useMovements } from '../../api/hooks/movements';
import { palette, spacing } from '../../theme';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { EmptyState } from '../../ui/EmptyState';
import { AppHeader } from '../../ui/AppHeader';
import { StatusPill } from '../../ui/StatusPill';

export const SupplierMovementsScreen = () => {
  const { data, isLoading, refetch } = useMovements();
  const list = data ?? [];
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Movimentos do fornecedor" />
      {isLoading ? (
        <>
          <SkeletonLoader width={200} />
          <SkeletonLoader width={220} />
        </>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: any) => (
            <List.Item
              title={`${item.type} - ${item.qty}`}
              description={new Date(item.createdAt).toLocaleString()}
              right={() => <StatusPill label={item.type} status="info" />}
            />
          )}
          ListEmptyComponent={<EmptyState title="Sem movimentos" description="Nenhum registro encontrado." />}
          refreshing={isLoading}
          onRefresh={refetch}
          onMomentumScrollEnd={() => setToast({ visible: true, message: 'Atualizado' })}
        />
      )}
      <Snackbar visible={toast.visible} onDismiss={() => setToast({ visible: false, message: '' })} duration={1200}>
        {toast.message}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.white, padding: spacing.lg },
});
