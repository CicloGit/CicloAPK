import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';
import { AppCard } from '../../ui/AppCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { StatusPill } from '../../ui/StatusPill';
import { palette, spacing, typography } from '../../theme';
import { useRequests } from '../../api/hooks/requests';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { EmptyState } from '../../ui/EmptyState';

export const ClientHistory = () => {
  const { data, isLoading, refetch } = useRequests('mine');
  const requests = data ?? [];

  return (
    <View style={styles.container}>
      <SectionHeader title="Historico" />
      <AppCard>
        {isLoading ? (
          <>
            <SkeletonLoader width={240} />
            <SkeletonLoader width={210} />
          </>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item: any) => item.id}
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
              />
            )}
            ListEmptyComponent={
              <EmptyState
                title="Sem solicitacoes"
                description="Crie uma solicitacao para ver aqui."
              />
            }
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
