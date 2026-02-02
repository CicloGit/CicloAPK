import React, { useState, useMemo } from 'react';
import { SafeAreaView, FlatList, StyleSheet, Image, View } from 'react-native';
import { List, Searchbar } from 'react-native-paper';
import { useCatalog } from '../../api/hooks/catalog';
import { palette, spacing } from '../../theme';
import { StatusPill } from '../../ui/StatusPill';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { EmptyState } from '../../ui/EmptyState';

const logo = require('../../../assets/icon.png');

export const ClientCatalogScreen = () => {
  const { data, isLoading, refetch } = useCatalog(true);
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      (data ?? []).filter((i: any) =>
        (i.displayName || i.name || '').toLowerCase().includes(query.toLowerCase()),
      ),
    [data, query],
  );

  return (
    <SafeAreaView style={styles.container}>
      <Searchbar
        placeholder="Buscar"
        value={query}
        onChangeText={setQuery}
        style={{ margin: spacing.sm }}
      />
      <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
        <Image source={logo} style={{ width: 64, height: 64 }} />
      </View>
      {isLoading ? (
        <>
          <SkeletonLoader width={240} />
          <SkeletonLoader width={200} />
        </>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: any) => (
            <List.Item
              title={item.displayName || item.name}
              description={`R$ ${item.sellPrice ?? '-'}`}
              right={() => <StatusPill label="Disponível" status="success" />}
            />
          )}
          ListEmptyComponent={<EmptyState title="Sem itens" description="Nenhum item publicado." />}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
  },
});
