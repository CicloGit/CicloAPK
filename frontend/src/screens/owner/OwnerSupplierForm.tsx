import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Checkbox, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../../ui/AppHeader';
import { AppTextField } from '../../ui/AppTextField';
import { AppButton } from '../../ui/AppButton';
import { palette, spacing, typography } from '../../theme';
import { useCreateSupplier } from '../../api/hooks/suppliers';

export const OwnerSupplierForm = () => {
  const nav = useNavigation<any>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const { mutateAsync, isPending } = useCreateSupplier();

  const toggleItem = (item: string) =>
    setItems((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));

  const catalog = ['Fertilizante A', 'Sementes Premium', 'Equipamentos'];

  const handleSave = async () => {
    await mutateAsync({ name, email, items });
    nav.goBack();
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Fornecedor" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.form}>
        <AppTextField label="Nome da empresa" value={name} onChangeText={setName} />
        <AppTextField label="E-mail / Contato" value={email} onChangeText={setEmail} />

        <Text style={styles.sectionLabel}>Insumos fornecidos</Text>
        {catalog.map((item) => (
          <Checkbox.Item
            key={item}
            label={item}
            status={items.includes(item) ? 'checked' : 'unchecked'}
            onPress={() => toggleItem(item)}
          />
        ))}

        <AppButton label={isPending ? 'Salvando...' : 'Salvar'} onPress={handleSave} disabled={isPending} />
        <AppButton label="Cancelar" variant="outline" onPress={() => nav.goBack()} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
  },
  form: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: palette.graphite,
    marginBottom: spacing.xs,
  },
});
