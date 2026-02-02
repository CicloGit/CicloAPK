import React, { useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, View } from 'react-native';
import { List, Switch, Text, TextInput } from 'react-native-paper';
import { useSupplierItems } from '../../api/hooks/catalogItems';
import { useCatalog, useUpdateCatalogItem } from '../../api/hooks/catalog';
import { AppCard } from '../../ui/AppCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { AppButton } from '../../ui/AppButton';
import { palette, spacing, typography } from '../../theme';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { EmptyState } from '../../ui/EmptyState';

export const AdminCatalogScreen = () => {
  const { data: supplierItems, isLoading: loadingSup } = useSupplierItems();
  const { data: catalog, isLoading: loadingCat, refetch } = useCatalog(false);
  const { mutateAsync: updateCat } = useUpdateCatalogItem();
  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});

  const merged = useMemo(() => {
    const supMap: Record<string, any> = {};
    (supplierItems ?? []).forEach((s: any) => {
      supMap[s.supplierItemId || s.id] = s;
    });
    return (catalog ?? []).map((c: any) => ({
      ...c,
      supplier: supMap[c.supplierItemId],
    }));
  }, [catalog, supplierItems]);

  const handleSavePrice = async (id: string) => {
    const value = Number(editingPrice[id]);
    if (isNaN(value)) return;
    await updateCat({ id, sellPrice: value });
    setEditingPrice((prev) => ({ ...prev, [id]: '' }));
    refetch();
  };

  return (
    <SafeAreaView style={styles.container}>
      <SectionHeader title="Catálogo (vitrine)" />
      <AppCard>
        {loadingSup || loadingCat ? (
          <>
            <SkeletonLoader width={220} />
            <SkeletonLoader width={200} />
          </>
        ) : (
          <FlatList
            data={merged}
            keyExtractor={(item: any) => item.id}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: palette.gray200 }} />}
            renderItem={({ item }: any) => (
              <List.Item
                title={item.displayName || item?.supplier?.name || 'Item'}
                description={`Preço: R$ ${item.sellPrice ?? '-'} • Supplier: ${item.supplierId}`}
                right={() => (
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.label}>Publicado</Text>
                      <Switch
                        value={item.published}
                        onValueChange={(val) => updateCat({ id: item.id, published: val })}
                      />
                    </View>
                    <TextInput
                      mode="outlined"
                      label="Preço"
                      value={editingPrice[item.id] ?? ''}
                      onChangeText={(t) => setEditingPrice((p) => ({ ...p, [item.id]: t }))}
                      keyboardType="numeric"
                      style={{ width: 120 }}
                    />
                    <AppButton
                      label="Salvar"
                      variant="outline"
                      compact
                      onPress={() => handleSavePrice(item.id)}
                    />
                  </View>
                )}
              />
            )}
            ListEmptyComponent={<EmptyState title="Sem itens" description="Publique itens para a vitrine." />}
            refreshing={loadingCat}
            onRefresh={refetch}
          />
        )}
      </AppCard>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.white, padding: spacing.lg },
  label: { ...typography.body, color: palette.graphite },
});
