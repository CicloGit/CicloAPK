import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { palette, spacing, typography } from '../../theme';
import { AppButton } from '../../ui/AppButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { StatusPill } from '../../ui/StatusPill';
import { AppCard } from '../../ui/AppCard';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { useUsers } from '../../api/hooks/users';
import { EmptyState } from '../../ui/EmptyState';

export const OwnerUsers = () => {
  const navigation = useNavigation<any>();
  const { data, isLoading } = useUsers();

  const users = data ?? [];

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Usuarios do tenant"
        actionLabel="Criar"
        onPressAction={() => navigation.navigate('OwnerUserForm')}
      />

      <AppCard>
        {isLoading ? (
          <>
            <SkeletonLoader width={220} />
            <SkeletonLoader width={180} />
            <SkeletonLoader width={200} />
          </>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item: any) => item.id || item.uid}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: palette.gray200 }} />}
            renderItem={({ item }: any) => (
              <List.Item
                title={item.displayName}
                description={`${item.role} - ${item.email}`}
                right={() => (
                  <StatusPill
                    label={item.active === false ? 'Inativo' : 'Ativo'}
                    status={item.active === false ? 'warning' : 'success'}
                  />
                )}
                onPress={() => navigation.navigate('OwnerUserForm', { id: item.id || item.uid })}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                title="Nenhum usuario"
                description="Crie o primeiro usuario para este tenant."
                ctaLabel="Criar usuario"
                onPressCta={() => navigation.navigate('OwnerUserForm')}
              />
            }
          />
        )}
      </AppCard>

      <AppButton label="Criar novo usuario" variant="primary" onPress={() => navigation.navigate('OwnerUserForm')} />
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
