import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from '../../ui/AppButton';
import { AppCard } from '../../ui/AppCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { StatusPill } from '../../ui/StatusPill';
import { palette, spacing } from '../../theme';
import { useSuppliers } from '../../api/hooks/suppliers';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { EmptyState } from '../../ui/EmptyState';

export const OwnerSuppliers = () => {
  const navigation = useNavigation<any>();
  const { data, isLoading } = useSuppliers();
  const suppliers = data ?? [];

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Fornecedores"
        actionLabel="Adicionar"
        onPressAction={() => navigation.navigate('OwnerSupplierForm')}
      />
      <AppCard>
        {isLoading ? (
          <>
            <SkeletonLoader width={220} />
            <SkeletonLoader width={200} />
          </>
        ) : (
          <FlatList
            data={suppliers}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }: any) => (
              <List.Item
                title={item.name}
                description={item.contact || item.email}
                right={() => (
                  <StatusPill
                    label={item.status === 'active' ? 'Ativo' : 'Pausado'}
                    status={item.status === 'active' ? 'success' : 'warning'}
                  />
                )}
                onPress={() => navigation.navigate('OwnerSupplierForm', { id: item.id })}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                title="Nenhum fornecedor"
                description="Cadastre fornecedores para vincular insumos."
                ctaLabel="Novo fornecedor"
                onPressCta={() => navigation.navigate('OwnerSupplierForm')}
              />
            }
          />
        )}
      </AppCard>
      <AppButton label="Novo fornecedor" onPress={() => navigation.navigate('OwnerSupplierForm')} />
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
