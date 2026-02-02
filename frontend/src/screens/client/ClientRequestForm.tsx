import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text, TextInput, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../../ui/AppHeader';
import { AppButton } from '../../ui/AppButton';
import { palette, spacing, typography } from '../../theme';
import { useCatalog } from '../../api/hooks/catalog';
import { useCreateRequest } from '../../api/hooks/requests';
import { StatusPill } from '../../ui/StatusPill';

type Line = { catalogItemId: string; name: string; qty: number };

export const ClientRequestForm = () => {
  const nav = useNavigation<any>();
  const { data: catalog } = useCatalog(true);
  const { mutateAsync, isPending } = useCreateRequest();
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const filtered = useMemo(() => {
    const list = catalog ?? [];
    return list.filter((i: any) =>
      (i.displayName || i.name || '').toLowerCase().includes(query.toLowerCase()),
    );
  }, [catalog, query]);

  const addLine = (item: any) => {
    if (lines.find((l) => l.catalogItemId === item.id || l.catalogItemId === item.catalogItemId)) return;
    setLines([
      ...lines,
      {
        catalogItemId: item.catalogItemId || item.id,
        name: item.displayName || item.name || 'Item',
        qty: 1,
      },
    ]);
  };

  const updateQty = (id: string, qty: string) =>
    setLines((prev) =>
      prev.map((l) => (l.catalogItemId === id ? { ...l, qty: Number(qty) || 0 } : l)),
    );

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.catalogItemId !== id));

  const submit = async () => {
    const payload = {
      lines: lines.map((l) => ({ catalogItemId: l.catalogItemId, qty: l.qty })),
      notes,
    };
    await mutateAsync(payload);
    setToast({ visible: true, message: 'Solicitacao enviada' });
    setTimeout(() => nav.goBack(), 500);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Solicitar insumo" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.form}>
        <TextInput
          mode="outlined"
          placeholder="Buscar item"
          value={query}
          onChangeText={setQuery}
          left={<TextInput.Icon icon="magnify" />}
          style={styles.search}
        />
        <List.Section>
          {filtered?.map((item: any) => (
            <List.Item
              key={item.id}
              title={item.displayName || item.name}
              description={`Preço: ${item.sellPrice ?? '-'}`}
              onPress={() => addLine(item)}
              right={() => <StatusPill label="Add" status="info" />}
            />
          ))}
        </List.Section>

        <Text style={styles.sectionLabel}>Itens selecionados</Text>
        {lines.map((line) => (
          <View key={line.catalogItemId} style={styles.line}>
            <View>
              <Text style={styles.lineTitle}>{line.name}</Text>
            </View>
            <TextInput
              mode="outlined"
              label="Qtd"
              value={String(line.qty)}
              onChangeText={(v) => updateQty(line.catalogItemId, v)}
              keyboardType="numeric"
              style={{ width: 90 }}
            />
            <AppButton label="Remover" variant="outline" onPress={() => removeLine(line.catalogItemId)} />
          </View>
        ))}

        <TextInput
          mode="outlined"
          label="Observacoes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={{ minHeight: 100 }}
        />

        <AppButton
          label={isPending ? 'Enviando...' : 'Enviar solicitacao'}
          onPress={submit}
          disabled={isPending || lines.length === 0}
        />
        <AppButton label="Cancelar" variant="outline" onPress={() => nav.goBack()} />
      </ScrollView>
      <Snackbar visible={toast.visible} onDismiss={() => setToast({ visible: false, message: '' })} duration={1500}>
        {toast.message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.white },
  form: { padding: spacing.lg, gap: spacing.md },
  search: { marginBottom: spacing.sm },
  sectionLabel: { ...typography.label, color: palette.graphite },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  lineTitle: { ...typography.subheading, color: palette.graphite },
});
