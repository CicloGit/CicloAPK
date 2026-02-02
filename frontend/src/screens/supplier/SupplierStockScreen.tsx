import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { TextInput, Text, Snackbar } from 'react-native-paper';
import { useCreateMovement, useStockBalances } from '../../api/hooks/stock';
import { useSupplierItems } from '../../api/hooks/catalogItems';
import { AppButton } from '../../ui/AppButton';
import { palette, spacing, typography } from '../../theme';
import { AppHeader } from '../../ui/AppHeader';
import { StatusPill } from '../../ui/StatusPill';

export const SupplierStockScreen = () => {
  const { mutateAsync, isPending } = useCreateMovement();
  const { data: items } = useSupplierItems();
  const [selectedId, setSelectedId] = useState<string>('');
  const [qty, setQty] = useState('0');
  const [type, setType] = useState<'IN' | 'ADJUST'>('IN');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const { data: balances } = useStockBalances();
  const balanceMap = useMemo(() => {
    const m: Record<string, any> = {};
    (balances ?? []).forEach((b: any) => {
      m[b.supplierItemId] = b;
    });
    return m;
  }, [balances]);

  const selectedItem = useMemo(
    () => (items ?? []).find((i: any) => (i.supplierItemId || i.id) === selectedId),
    [items, selectedId],
  );

  const submit = async () => {
    const payload: any = {
      supplierItemId: selectedId,
      qty: Number(qty),
      type,
      note: note || undefined,
    };
    await mutateAsync(payload);
    setToast({ visible: true, message: 'Movimento registrado' });
    setQty('0');
    setNote('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Reposição do fornecedor" />
      <View style={styles.form}>
        <Text style={styles.label}>Selecionar item</Text>
        <TextInput
          mode="outlined"
          placeholder="Digite para filtrar"
          value={selectedItem?.name || ''}
          onChangeText={(text) => {
            const found = (items ?? []).find((i: any) =>
              (i.name || '').toLowerCase().includes(text.toLowerCase()),
            );
            if (found) setSelectedId(found.supplierItemId || found.id);
          }}
          right={
            <TextInput.Icon
              icon="menu-down"
              onPress={() => {
                // pick first as simple list fallback
                if (!selectedId && items?.[0]) setSelectedId(items[0].supplierItemId || items[0].id);
              }}
            />
          }
        />
        {selectedItem ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Text style={styles.label}>Saldo:</Text>
            <StatusPill
              label={`Disp ${balanceMap[selectedId]?.available ?? 0}`}
              status={(balanceMap[selectedId]?.lowStock && 'warning') || 'success'}
            />
          </View>
        ) : null}

        <Text style={styles.label}>Quantidade</Text>
        <TextInput mode="outlined" value={qty} onChangeText={setQty} keyboardType="numeric" />
        <Text style={styles.label}>Tipo</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <AppButton label="IN" variant={type === 'IN' ? 'primary' : 'outline'} onPress={() => setType('IN')} />
          <AppButton
            label="ADJUST"
            variant={type === 'ADJUST' ? 'primary' : 'outline'}
            onPress={() => setType('ADJUST')}
          />
        </View>
        <TextInput mode="outlined" label="Nota (opcional)" value={note} onChangeText={setNote} />
        <AppButton
          label={isPending ? 'Lançando...' : 'Lançar'}
          onPress={submit}
          disabled={isPending || !selectedId}
        />
      </View>
      <Snackbar
        visible={toast.visible}
        onDismiss={() => setToast({ visible: false, message: '' })}
        duration={2000}
      >
        {toast.message}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.white },
  form: { padding: spacing.lg, gap: spacing.sm },
  label: { ...typography.body, color: palette.graphite },
});
