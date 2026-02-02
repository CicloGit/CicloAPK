import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Switch, Text } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AppHeader } from '../../ui/AppHeader';
import { AppTextField } from '../../ui/AppTextField';
import { AppButton } from '../../ui/AppButton';
import { palette, spacing, typography } from '../../theme';
import { useCreateItem, useUpdateItem } from '../../api/hooks/items';

export const AdminItemForm = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const existing = route.params?.item;
  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '');
  const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl ?? '');
  const [minStock, setMinStock] = useState(existing?.minStock ? String(existing.minStock) : '');
  const [active, setActive] = useState(existing?.active !== false);

  const { mutateAsync: createItem, isPending: creating } = useCreateItem();
  const { mutateAsync: updateItem, isPending: updating } = useUpdateItem();

  const isEditing = !!existing?.id;

  const handleSave = async () => {
    const payload = {
      name,
      category,
      unit,
      price: price ? Number(price) : undefined,
      photoUrl: photoUrl || undefined,
      minStock: minStock ? Number(minStock) : undefined,
      active,
    };
    if (isEditing) {
      await updateItem({ id: existing.id, ...payload });
    } else {
      await createItem(payload);
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <AppHeader title={isEditing ? 'Editar item' : 'Novo item'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.form}>
        <AppTextField label="Nome" value={name} onChangeText={setName} />
        <AppTextField label="Categoria" value={category} onChangeText={setCategory} />
        <AppTextField label="Unidade" value={unit} onChangeText={setUnit} />
        <AppTextField label="Preco" value={price} onChangeText={setPrice} keyboardType="numeric" />
        <AppTextField label="URL da foto (opcional)" value={photoUrl} onChangeText={setPhotoUrl} />
        <AppTextField
          label="Estoque minimo"
          value={minStock}
          onChangeText={setMinStock}
          keyboardType="numeric"
        />
        <View style={styles.switchRow}>
          <Text style={styles.label}>Ativo</Text>
          <Switch value={active} onValueChange={setActive} />
        </View>
        <AppButton
          label={creating || updating ? 'Salvando...' : 'Salvar'}
          onPress={handleSave}
          disabled={creating || updating}
        />
        <AppButton label="Cancelar" variant="outline" onPress={() => navigation.goBack()} />
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.body,
    color: palette.graphite,
  },
});
